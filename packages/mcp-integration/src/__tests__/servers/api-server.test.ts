import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import {
  APIServer,
  type APIServerConfig,
  type IHttpClient,
} from "../../servers/api-server.js";

function makeMCPConfig(): MCPServerConfig {
  return {
    name: "test-api",
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect: true,
    env: {},
  };
}

function makeAPIConfig(): APIServerConfig {
  return {
    baseUrl: "https://api.example.com",
    endpoints: [
      {
        name: "get_user",
        description: "Get a user by ID",
        method: "GET",
        path: "/users/:id",
        parameters: [
          { name: "id", type: "string", in: "path", required: true },
        ],
        cacheTtlMs: 5000,
      },
      {
        name: "create_user",
        description: "Create a new user",
        method: "POST",
        path: "/users",
        parameters: [
          { name: "body", type: "object", in: "body", required: true },
        ],
      },
      {
        name: "search_users",
        description: "Search users",
        method: "GET",
        path: "/users",
        parameters: [
          { name: "q", type: "string", in: "query", required: false },
        ],
      },
    ],
    maxRequestsPerSecond: 100, // high limit for tests
    maxRetries: 1,
  };
}

function makeMockHttpClient(): IHttpClient {
  return {
    request: vi.fn().mockResolvedValue({
      status: 200,
      data: { id: "123", name: "Alice" },
      headers: {},
    }),
  };
}

describe("APIServer", () => {
  let server: APIServer;
  let httpClient: IHttpClient;

  beforeEach(async () => {
    httpClient = makeMockHttpClient();
    server = new APIServer(makeMCPConfig(), makeAPIConfig(), httpClient);
    await server.start();
  });

  it("registers tools from endpoint definitions", () => {
    const tools = server.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toEqual(["get_user", "create_user", "search_users"]);
  });

  it("substitutes path parameters in URL", async () => {
    await server.executeTool("get_user", { id: "42" });
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "https://api.example.com/users/42",
      }),
    );
  });

  it("passes query parameters", async () => {
    await server.executeTool("search_users", { q: "alice" });
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: { q: "alice" },
      }),
    );
  });

  it("passes body for POST endpoints", async () => {
    await server.executeTool("create_user", {
      body: { name: "Bob" },
    });
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        body: { name: "Bob" },
      }),
    );
  });

  it("caches responses with cacheTtlMs", async () => {
    await server.executeTool("get_user", { id: "42" });
    await server.executeTool("get_user", { id: "42" });
    // Should only have called the HTTP client once due to cache
    expect(httpClient.request).toHaveBeenCalledTimes(1);
  });

  it("does not cache when cacheTtlMs is not set", async () => {
    await server.executeTool("create_user", { body: { name: "A" } });
    await server.executeTool("create_user", { body: { name: "A" } });
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });

  it("retries on failure", async () => {
    (httpClient.request as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ status: 200, data: { ok: true }, headers: {} });

    const result = await server.executeTool("search_users", { q: "test" });
    expect(result.success).toBe(true);
    expect(httpClient.request).toHaveBeenCalledTimes(2);
  });

  it("returns failure after max retries exceeded", async () => {
    (httpClient.request as ReturnType<typeof vi.fn>)
      .mockRejectedValue(new Error("always fails"));

    const result = await server.executeTool("search_users", { q: "test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("always fails");
  });
});
