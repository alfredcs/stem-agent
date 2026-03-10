import { describe, it, expect, vi, beforeEach } from "vitest";
import { SSETransport } from "../../transport/sse-transport.js";
import { MCPTransportError } from "../../errors.js";

/* ------------------------------------------------------------------ */
/*  Mock global fetch                                                  */
/* ------------------------------------------------------------------ */

/**
 * Create an SSE stream where events can be pushed on demand.
 * Call `push(data)` to enqueue an SSE event, `close()` to end the stream.
 */
function makeControllableSSEStream() {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    stream,
    push(data: string) {
      controller.enqueue(encoder.encode(data));
    },
    close() {
      controller.close();
    },
  };
}

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("SSETransport", () => {
  let transport: SSETransport;

  beforeEach(() => {
    vi.clearAllMocks();
    transport = new SSETransport({ url: "http://localhost:8080/mcp" });
  });

  it("throws MCPTransportError when SSE connect fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, body: null });
    await expect(transport.connect()).rejects.toThrow(MCPTransportError);
  });

  it("send throws when not connected", async () => {
    await expect(transport.send("tools/list")).rejects.toThrow(
      MCPTransportError,
    );
  });

  it("connects and processes SSE response", async () => {
    const sse = makeControllableSSEStream();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, body: sse.stream });

    await transport.connect();
    expect(transport.isConnected()).toBe(true);

    // POST for the send call — succeeds immediately
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    // Start the send (registers pending promise with id=1)
    const resultPromise = transport.send("tools/list");

    // Now push the SSE response with matching id
    await new Promise((r) => setTimeout(r, 20));
    sse.push(
      `data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: ["a"] } })}\n\n`,
    );

    const result = await resultPromise;
    expect(result).toEqual({ tools: ["a"] });

    sse.close();
  });

  it("disconnect marks transport as disconnected", async () => {
    const sse = makeControllableSSEStream();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, body: sse.stream });
    await transport.connect();
    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
  });

  it("dispatches notifications from SSE stream", async () => {
    const sse = makeControllableSSEStream();
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, body: sse.stream });

    const handler = vi.fn();
    transport.onNotification(handler);
    await transport.connect();

    sse.push(
      `data: ${JSON.stringify({ jsonrpc: "2.0", method: "server/log", params: { msg: "hello" } })}\n\n`,
    );

    // Give the stream reader time to process
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalledWith({
      method: "server/log",
      params: { msg: "hello" },
    });

    sse.close();
  });
});
