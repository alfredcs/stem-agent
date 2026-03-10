import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import { DatabaseServer, type IDatabaseAdapter } from "../../servers/database-server.js";

function makeConfig(): MCPServerConfig {
  return {
    name: "test-db",
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect: true,
    env: {},
  };
}

function makeMockDb(): IDatabaseAdapter {
  return {
    query: vi.fn().mockResolvedValue([{ id: 1, name: "test" }]),
    execute: vi.fn().mockResolvedValue(1),
    getSchema: vi.fn().mockResolvedValue({ tables: ["users"] }),
    migrate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("DatabaseServer", () => {
  let server: DatabaseServer;
  let db: IDatabaseAdapter;

  beforeEach(async () => {
    db = makeMockDb();
    server = new DatabaseServer(makeConfig(), db);
    await server.start();
  });

  it("registers all 6 tools", () => {
    const tools = server.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "db_query",
      "db_insert",
      "db_update",
      "db_delete",
      "db_schema_inspect",
      "db_migrate",
    ]);
  });

  it("db_query calls adapter.query with params", async () => {
    const result = await server.executeTool("db_query", {
      sql: "SELECT * FROM users WHERE id = $1",
      params: [1],
    });
    expect(result.success).toBe(true);
    expect(db.query).toHaveBeenCalledWith({
      sql: "SELECT * FROM users WHERE id = $1",
      params: [1],
    });
  });

  it("db_insert builds INSERT with parameterized values", async () => {
    const result = await server.executeTool("db_insert", {
      table: "users",
      rows: [{ name: "Alice", email: "alice@example.com" }],
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ insertedCount: 1 });
    expect(db.execute).toHaveBeenCalled();
    const call = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      sql: string;
      params: unknown[];
    };
    expect(call.sql).toContain("INSERT INTO");
    expect(call.params).toEqual(["Alice", "alice@example.com"]);
  });

  it("db_update calls adapter.execute", async () => {
    const result = await server.executeTool("db_update", {
      sql: "UPDATE users SET name = $1 WHERE id = $2",
      params: ["Bob", 1],
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ affectedRows: 1 });
  });

  it("db_delete calls adapter.execute", async () => {
    const result = await server.executeTool("db_delete", {
      sql: "DELETE FROM users WHERE id = $1",
      params: [1],
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ deletedRows: 1 });
  });

  it("db_schema_inspect returns schema", async () => {
    const result = await server.executeTool("db_schema_inspect", {});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ tables: ["users"] });
  });

  it("db_migrate runs script", async () => {
    const result = await server.executeTool("db_migrate", {
      script: "ALTER TABLE users ADD COLUMN age INT",
    });
    expect(result.success).toBe(true);
    expect(db.migrate).toHaveBeenCalledWith("ALTER TABLE users ADD COLUMN age INT");
  });

  it("healthCheck queries the database", async () => {
    expect(await server.healthCheck()).toBe(true);
    (db.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("down"));
    expect(await server.healthCheck()).toBe(false);
  });

  it("cleanup closes the adapter", async () => {
    await server.stop();
    expect(db.close).toHaveBeenCalled();
  });

  it("rejects invalid identifiers in insert", async () => {
    const result = await server.executeTool("db_insert", {
      table: "users; DROP TABLE--",
      rows: [{ name: "hacker" }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid identifier");
  });

  it("returns failure result when adapter throws", async () => {
    (db.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("connection lost"),
    );
    const result = await server.executeTool("db_query", { sql: "SELECT 1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("connection lost");
  });
});
