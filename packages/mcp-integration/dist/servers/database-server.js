"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseServer = void 0;
const base_server_js_1 = require("./base-server.js");
/**
 * MCP server exposing database operations as tools.
 *
 * Supports PostgreSQL and SQLite via the injected {@link IDatabaseAdapter}.
 * All queries are parameterized — no string interpolation of user input.
 */
class DatabaseServer extends base_server_js_1.BaseMCPServer {
    db;
    constructor(config, db, logger) {
        super(config, logger);
        this.db = db;
    }
    /** @inheritdoc */
    async initialize() {
        this.registerTool("db_query", "Execute a read-only SQL query and return result rows", [
            { name: "sql", type: "string", description: "SQL query", required: true },
            { name: "params", type: "array", description: "Query parameters", required: false },
        ], async (args) => {
            const sql = args["sql"];
            const params = args["params"] ?? [];
            return this.db.query({ sql, params });
        });
        this.registerTool("db_insert", "Insert rows into a table", [
            { name: "table", type: "string", description: "Target table name", required: true },
            { name: "rows", type: "array", description: "Array of row objects to insert", required: true },
        ], async (args) => {
            const table = args["table"];
            const rows = args["rows"];
            let total = 0;
            for (const row of rows) {
                const cols = Object.keys(row);
                const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
                const sql = `INSERT INTO ${this.escapeIdentifier(table)} (${cols.map((c) => this.escapeIdentifier(c)).join(", ")}) VALUES (${placeholders})`;
                total += await this.db.execute({ sql, params: Object.values(row) });
            }
            return { insertedCount: total };
        });
        this.registerTool("db_update", "Update rows in a table matching a condition", [
            { name: "sql", type: "string", description: "UPDATE SQL statement", required: true },
            { name: "params", type: "array", description: "Query parameters", required: false },
        ], async (args) => {
            const sql = args["sql"];
            const params = args["params"] ?? [];
            const affected = await this.db.execute({ sql, params });
            return { affectedRows: affected };
        });
        this.registerTool("db_delete", "Delete rows from a table matching a condition", [
            { name: "sql", type: "string", description: "DELETE SQL statement", required: true },
            { name: "params", type: "array", description: "Query parameters", required: false },
        ], async (args) => {
            const sql = args["sql"];
            const params = args["params"] ?? [];
            const affected = await this.db.execute({ sql, params });
            return { deletedRows: affected };
        });
        this.registerTool("db_schema_inspect", "Return the database schema (tables, columns, types)", [], async () => this.db.getSchema());
        this.registerTool("db_migrate", "Run a migration script against the database", [
            { name: "script", type: "string", description: "Migration SQL script", required: true },
        ], async (args) => {
            const script = args["script"];
            await this.db.migrate(script);
            return { success: true };
        });
    }
    /** @inheritdoc */
    async cleanup() {
        await this.db.close();
    }
    /** @inheritdoc */
    async healthCheck() {
        if (!this.isRunning)
            return false;
        try {
            await this.db.query({ sql: "SELECT 1" });
            return true;
        }
        catch {
            return false;
        }
    }
    /** Escape a SQL identifier to prevent injection in table/column names. */
    escapeIdentifier(id) {
        // Only allow alphanumeric + underscore
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
            throw new Error(`Invalid identifier: ${id}`);
        }
        return `"${id}"`;
    }
}
exports.DatabaseServer = DatabaseServer;
//# sourceMappingURL=database-server.js.map