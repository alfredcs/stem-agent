import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";

/** Result row from a database query. */
export type QueryRow = Record<string, unknown>;

/** Parameterized query with values. */
export interface ParameterizedQuery {
  sql: string;
  params?: unknown[];
}

/**
 * Adapter interface for database backends (PostgreSQL, SQLite, etc.).
 * Implementations handle connection pooling and driver specifics.
 */
export interface IDatabaseAdapter {
  /** Execute a read query and return rows. */
  query(q: ParameterizedQuery): Promise<QueryRow[]>;

  /** Execute a write statement and return affected row count. */
  execute(q: ParameterizedQuery): Promise<number>;

  /** Return the database schema (tables, columns, types). */
  getSchema(): Promise<Record<string, unknown>>;

  /** Run a migration script. */
  migrate(script: string): Promise<void>;

  /** Close connections. */
  close(): Promise<void>;
}

/**
 * MCP server exposing database operations as tools.
 *
 * Supports PostgreSQL and SQLite via the injected {@link IDatabaseAdapter}.
 * All queries are parameterized — no string interpolation of user input.
 */
export class DatabaseServer extends BaseMCPServer {
  private readonly db: IDatabaseAdapter;

  constructor(config: MCPServerConfig, db: IDatabaseAdapter, logger?: Logger) {
    super(config, logger);
    this.db = db;
  }

  /** @inheritdoc */
  protected async initialize(): Promise<void> {
    this.registerTool(
      "db_query",
      "Execute a read-only SQL query and return result rows",
      [
        { name: "sql", type: "string", description: "SQL query", required: true },
        { name: "params", type: "array", description: "Query parameters", required: false },
      ],
      async (args) => {
        const sql = args["sql"] as string;
        const params = (args["params"] as unknown[] | undefined) ?? [];
        return this.db.query({ sql, params });
      },
    );

    this.registerTool(
      "db_insert",
      "Insert rows into a table",
      [
        { name: "table", type: "string", description: "Target table name", required: true },
        { name: "rows", type: "array", description: "Array of row objects to insert", required: true },
      ],
      async (args) => {
        const table = args["table"] as string;
        const rows = args["rows"] as QueryRow[];
        let total = 0;
        for (const row of rows) {
          const cols = Object.keys(row);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          const sql = `INSERT INTO ${this.escapeIdentifier(table)} (${cols.map((c) => this.escapeIdentifier(c)).join(", ")}) VALUES (${placeholders})`;
          total += await this.db.execute({ sql, params: Object.values(row) });
        }
        return { insertedCount: total };
      },
    );

    this.registerTool(
      "db_update",
      "Update rows in a table matching a condition",
      [
        { name: "sql", type: "string", description: "UPDATE SQL statement", required: true },
        { name: "params", type: "array", description: "Query parameters", required: false },
      ],
      async (args) => {
        const sql = args["sql"] as string;
        const params = (args["params"] as unknown[] | undefined) ?? [];
        const affected = await this.db.execute({ sql, params });
        return { affectedRows: affected };
      },
    );

    this.registerTool(
      "db_delete",
      "Delete rows from a table matching a condition",
      [
        { name: "sql", type: "string", description: "DELETE SQL statement", required: true },
        { name: "params", type: "array", description: "Query parameters", required: false },
      ],
      async (args) => {
        const sql = args["sql"] as string;
        const params = (args["params"] as unknown[] | undefined) ?? [];
        const affected = await this.db.execute({ sql, params });
        return { deletedRows: affected };
      },
    );

    this.registerTool(
      "db_schema_inspect",
      "Return the database schema (tables, columns, types)",
      [],
      async () => this.db.getSchema(),
    );

    this.registerTool(
      "db_migrate",
      "Run a migration script against the database",
      [
        { name: "script", type: "string", description: "Migration SQL script", required: true },
      ],
      async (args) => {
        const script = args["script"] as string;
        await this.db.migrate(script);
        return { success: true };
      },
    );
  }

  /** @inheritdoc */
  protected override async cleanup(): Promise<void> {
    await this.db.close();
  }

  /** @inheritdoc */
  override async healthCheck(): Promise<boolean> {
    if (!this.isRunning) return false;
    try {
      await this.db.query({ sql: "SELECT 1" });
      return true;
    } catch {
      return false;
    }
  }

  /** Escape a SQL identifier to prevent injection in table/column names. */
  private escapeIdentifier(id: string): string {
    // Only allow alphanumeric + underscore
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
      throw new Error(`Invalid identifier: ${id}`);
    }
    return `"${id}"`;
  }
}
