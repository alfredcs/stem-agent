import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StemAgentClient } from "../frameworks/sdk.js";

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

function sseResponse(chunks: string[]): Response {
  let index = 0;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });

  return {
    ok: true,
    status: 200,
    statusText: "OK",
    body: stream,
    headers: new Headers({ "content-type": "text/event-stream" }),
    json: () => Promise.reject(new Error("SSE")),
    text: () => Promise.reject(new Error("SSE")),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StemAgentClient", () => {
  let client: StemAgentClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new StemAgentClient({
      baseUrl: "http://localhost:8000",
      apiKey: "test-key",
    });
  });

  afterEach(() => {
    client.close();
  });

  // ---- chat ---------------------------------------------------------------

  it("chat() sends POST to /api/v1/chat and returns response", async () => {
    const body = { task_id: "t1", status: "completed", content: "Hello!" };
    mockFetch.mockResolvedValueOnce(jsonResponse(body));

    const res = await client.chat({ message: "Hi", callerId: "u1" });

    expect(res).toEqual(body);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/chat");
    expect(opts.method).toBe("POST");
    expect(opts.headers["X-API-Key"]).toBe("test-key");

    const sent = JSON.parse(opts.body);
    expect(sent.message).toBe("Hi");
    expect(sent.caller_id).toBe("u1");
  });

  it("chat() throws on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "bad" }, 500));
    await expect(client.chat({ message: "fail" })).rejects.toThrow(
      /request failed: 500/,
    );
  });

  // ---- chatStream ---------------------------------------------------------

  it("chatStream() parses SSE data lines", async () => {
    const chunks = [
      'data: {"id":"r1","status":"in_progress","content":"part1"}\n\n',
      'data: {"id":"r2","status":"completed","content":"part2"}\n\n',
      "data: [DONE]\n\n",
    ];
    mockFetch.mockResolvedValueOnce(sseResponse(chunks));

    const results: unknown[] = [];
    for await (const chunk of client.chatStream({ message: "stream" })) {
      results.push(chunk);
    }

    expect(results).toHaveLength(2);
    expect((results[0] as Record<string, unknown>).content).toBe("part1");
    expect((results[1] as Record<string, unknown>).content).toBe("part2");
  });

  // ---- getAgentCard -------------------------------------------------------

  it("getAgentCard() fetches /.well-known/agent.json", async () => {
    const card = { agentId: "a1", name: "Test Agent" };
    mockFetch.mockResolvedValueOnce(jsonResponse(card));

    const res = await client.getAgentCard();
    expect(res).toEqual(card);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/.well-known/agent.json");
  });

  // ---- getCallerProfile ---------------------------------------------------

  it("getCallerProfile() fetches correct URL", async () => {
    const profile = { callerId: "u1", totalInteractions: 5 };
    mockFetch.mockResolvedValueOnce(jsonResponse(profile));

    const res = await client.getCallerProfile("u1");
    expect(res).toEqual(profile);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/profile/u1");
  });

  // ---- getBehaviorParams --------------------------------------------------

  it("getBehaviorParams() fetches /api/v1/behavior", async () => {
    const params = { reasoningDepth: 3 };
    mockFetch.mockResolvedValueOnce(jsonResponse(params));

    const res = await client.getBehaviorParams();
    expect(res).toEqual(params);
  });

  // ---- listTools ----------------------------------------------------------

  it("listTools() returns tools array", async () => {
    const tools = [{ name: "search", description: "Search the web" }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ tools }));

    const res = await client.listTools();
    expect(res).toEqual(tools);
  });

  // ---- headers ------------------------------------------------------------

  it("merges custom headers", async () => {
    client.close();
    client = new StemAgentClient({
      baseUrl: "http://localhost:8000",
      headers: { "X-Custom": "val" },
    });

    mockFetch.mockResolvedValueOnce(jsonResponse({ tools: [] }));
    await client.listTools();

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers["X-Custom"]).toBe("val");
  });

  // ---- trailing-slash normalization ---------------------------------------

  it("strips trailing slashes from baseUrl", async () => {
    client.close();
    client = new StemAgentClient({ baseUrl: "http://localhost:8000///" });

    mockFetch.mockResolvedValueOnce(jsonResponse({ tools: [] }));
    await client.listTools();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/mcp/tools");
  });
});
