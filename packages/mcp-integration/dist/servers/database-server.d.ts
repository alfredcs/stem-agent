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
export declare class DatabaseServer extends BaseMCPServer {
    private readonly db;
    constructor(config: MCPServerConfig, db: IDatabaseAdapter, logger?: Logger);
    /** @inheritdoc */
    protected initialize(): Promise<void>;
    /** @inheritdoc */
    protected cleanup(): Promise<void>;
    /** @inheritdoc */
    healthCheck(): Promise<boolean>;
    /** Escape a SQL identifier to prevent injection in table/column names. */
    private escapeIdentifier;
}
//# sourceMappingURL=database-server.d.ts.map