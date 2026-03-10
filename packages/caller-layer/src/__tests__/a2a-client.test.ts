import { describe, it, expect, vi, beforeEach } from "vitest";
import { A2AClient, A2AError } from "../agents/a2a-client.js";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("A2AClient", () => {
  let client: A2AClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new A2AClient({
      endpoint: "http://agent:8000",
      maxRetries: 1,
      backoffMs: 10,
    });
  });

  // ---- discoverAgent ------------------------------------------------------

  it("discoverAgent() fetches and parses the agent card", async () => {
    const card = {
      agentId: "a1",
      name: "Test",
      description: "desc",
      version: "1.0",
      endpoint: "http://agent:8000",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(card));

    const result = await client.discoverAgent();
    expect(result.agentId).toBe("a1");
    expect(result.name).toBe("Test");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://agent:8000/.well-known/agent.json");
  });

  it("discoverAgent() throws on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    await expect(client.discoverAgent()).rejects.toThrow(/discovery failed/);
  });

  // ---- sendTask -----------------------------------------------------------

  it("sendTask() sends JSON-RPC tasks/send", async () => {
    const result = { id: "r1", status: "completed", content: "done" };
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ jsonrpc: "2.0", id: "x", result }),
    );

    const res = await client.sendTask({ content: "Analyze Q3" });
    expect(res).toEqual(result);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("http://agent:8000/a2a");
    const body = JSON.parse(opts.body);
    expect(body.method).toBe("tasks/send");
    expect(body.params.message.content).toBe("Analyze Q3");
  });

  // ---- getTask ------------------------------------------------------------

  it("getTask() sends JSON-RPC tasks/get", async () => {
    const result = { id: "r1", status: "completed", content: "result" };
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ jsonrpc: "2.0", id: "x", result }),
    );

    const res = await client.getTask("task-123");
    expect(res).toEqual(result);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.method).toBe("tasks/get");
    expect(body.params.task_id).toBe("task-123");
  });

  // ---- cancelTask ---------------------------------------------------------

  it("cancelTask() sends JSON-RPC tasks/cancel", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ jsonrpc: "2.0", id: "x", result: { cancelled: true } }),
    );

    const res = await client.cancelTask("task-123");
    expect(res.cancelled).toBe(true);
  });

  // ---- JSON-RPC error handling --------------------------------------------

  it("throws A2AError on JSON-RPC error response", async () => {
    const errorBody = jsonResponse({
      jsonrpc: "2.0",
      id: "x",
      error: { code: -32603, message: "Internal error" },
    });
    // Need responses for initial attempt + 1 retry
    mockFetch.mockResolvedValueOnce(errorBody);
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        jsonrpc: "2.0",
        id: "x",
        error: { code: -32603, message: "Internal error" },
      }),
    );

    await expect(client.sendTask({ content: "fail" })).rejects.toThrow(
      A2AError,
    );
  });

  // ---- Retry --------------------------------------------------------------

  it("retries on transient failure then succeeds", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(
        jsonResponse({
          jsonrpc: "2.0",
          id: "x",
          result: { status: "completed" },
        }),
      );

    const res = await client.sendTask({ content: "retry me" });
    expect(res.status).toBe("completed");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"));

    await expect(client.sendTask({ content: "fail" })).rejects.toThrow(
      "fail2",
    );
    // 1 initial + 1 retry
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ---- API key header -----------------------------------------------------

  it("sends X-API-Key when configured", async () => {
    client = new A2AClient({
      endpoint: "http://agent:8000",
      apiKey: "my-key",
      maxRetries: 0,
    });

    const card = {
      agentId: "a1",
      name: "T",
      description: "d",
      version: "1",
      endpoint: "http://agent:8000",
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(card));

    await client.discoverAgent();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["X-API-Key"]).toBe("my-key");
  });
});
