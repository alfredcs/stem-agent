import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import { MCPManager } from "../manager.js";
import type { BaseMCPServer } from "../servers/base-server.js";
import { MCPToolNotFoundError, MCPServerNotFoundError } from "../errors.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeConfig(name: string, autoConnect = true): MCPServerConfig {
  return {
    name,
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect,
    env: {},
  };
}

function makeMockServer(name: string, toolNames: string[]): BaseMCPServer {
  const tools = toolNames.map((t) => ({
    name: t,
    description: `tool ${t}`,
    parameters: [],
    serverName: name,
  }));

  return {
    name,
    isRunning: true,
    start: vi.fn(),
    stop: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    listTools: vi.fn().mockReturnValue(tools),
    executeTool: vi.fn().mockResolvedValue({
      toolName: toolNames[0],
      success: true,
      data: { result: "ok" },
      durationMs: 10,
    }),
  } as unknown as BaseMCPServer;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("MCPManager", () => {
  let manager: MCPManager;
  const mockServers = new Map<string, BaseMCPServer>();

  beforeEach(() => {
    mockServers.clear();
    manager = new MCPManager({
      configs: [makeConfig("db"), makeConfig("api"), makeConfig("skip", false)],
      serverFactory: async (cfg) => {
        const names =
          cfg.name === "db" ? ["db_query", "db_insert"] : ["api_get"];
        const server = makeMockServer(cfg.name, names);
        mockServers.set(cfg.name, server);
        return server;
      },
    });
  });

  it("connectAll starts only auto-connect servers", async () => {
    await manager.connectAll();
    expect(mockServers.has("db")).toBe(true);
    expect(mockServers.has("api")).toBe(true);
    expect(mockServers.has("skip")).toBe(false);
  });

  it("discoverCapabilities aggregates tools from all servers", async () => {
    await manager.connectAll();
    const tools = await manager.discoverCapabilities();
    const names = tools.map((t) => t.name);
    expect(names).toContain("db_query");
    expect(names).toContain("db_insert");
    expect(names).toContain("api_get");
  });

  it("callTool routes to the correct server", async () => {
    await manager.connectAll();
    await manager.callTool("db_query", { sql: "SELECT 1" });
    const dbServer = mockServers.get("db")!;
    expect(dbServer.executeTool).toHaveBeenCalledWith("db_query", {
      sql: "SELECT 1",
    });
  });

  it("callTool routes to explicit server when serverName provided", async () => {
    await manager.connectAll();
    await manager.callTool("db_query", { sql: "SELECT 1" }, "db");
    expect(mockServers.get("db")!.executeTool).toHaveBeenCalled();
  });

  it("callTool throws MCPToolNotFoundError for unknown tool", async () => {
    await manager.connectAll();
    await expect(
      manager.callTool("nonexistent", {}),
    ).rejects.toThrow(MCPToolNotFoundError);
  });

  it("callTool throws MCPServerNotFoundError when explicit server missing", async () => {
    await manager.connectAll();
    await expect(
      manager.callTool("db_query", {}, "missing_server"),
    ).rejects.toThrow(MCPServerNotFoundError);
  });

  it("dynamicConnect adds a new server at runtime", async () => {
    await manager.connectAll();
    let toolsBefore = await manager.discoverCapabilities();
    expect(toolsBefore.find((t) => t.name === "fs_read")).toBeUndefined();

    // Simulate dynamic connect
    const fsCfg = makeConfig("fs");
    manager = new MCPManager({
      configs: [makeConfig("db"), makeConfig("api")],
      serverFactory: async (cfg) => {
        if (cfg.name === "fs") {
          return makeMockServer("fs", ["fs_read"]);
        }
        const names = cfg.name === "db" ? ["db_query", "db_insert"] : ["api_get"];
        return makeMockServer(cfg.name, names);
      },
    });
    await manager.connectAll();
    await manager.dynamicConnect(fsCfg);

    const toolsAfter = await manager.discoverCapabilities();
    expect(toolsAfter.find((t) => t.name === "fs_read")).toBeDefined();
  });

  it("shutdown stops all servers and clears state", async () => {
    await manager.connectAll();
    await manager.shutdown();
    const tools = await manager.discoverCapabilities();
    expect(tools).toHaveLength(0);
  });

  it("healthCheck returns per-server status", async () => {
    await manager.connectAll();
    const status = await manager.healthCheck();
    expect(status["db"]).toBe(true);
    expect(status["api"]).toBe(true);
  });

  it("healthCheck returns false for unhealthy servers", async () => {
    await manager.connectAll();
    const dbServer = mockServers.get("db")!;
    (dbServer.healthCheck as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const status = await manager.healthCheck();
    expect(status["db"]).toBe(false);
  });

  it("does not register duplicate servers", async () => {
    await manager.connectAll();
    // connectAll again should not duplicate
    await manager.connectAll();
    const tools = await manager.discoverCapabilities();
    // Should still be 3 total tools, not 6
    expect(tools).toHaveLength(3);
  });
});
