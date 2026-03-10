import { describe, it, expect, vi, beforeEach } from "vitest";
import { StdioTransport } from "../../transport/stdio-transport.js";
import { MCPTransportError } from "../../errors.js";

/* ------------------------------------------------------------------ */
/*  Mock child_process                                                 */
/* ------------------------------------------------------------------ */

const mockStdin = { write: vi.fn() };
const mockStdout = { on: vi.fn() };
const mockStderr = { on: vi.fn() };
const mockProcess = {
  stdin: mockStdin,
  stdout: mockStdout,
  stderr: mockStderr,
  on: vi.fn(),
  kill: vi.fn(),
};

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => mockProcess),
}));

describe("StdioTransport", () => {
  let transport: StdioTransport;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStdout.on.mockReset();
    mockStderr.on.mockReset();
    mockProcess.on.mockReset();
    mockStdin.write.mockReset();

    transport = new StdioTransport({ command: "test-cmd", args: ["--flag"] });
  });

  it("connects and marks as connected", async () => {
    await transport.connect();
    expect(transport.isConnected()).toBe(true);
  });

  it("connect is idempotent", async () => {
    await transport.connect();
    await transport.connect();
    expect(transport.isConnected()).toBe(true);
  });

  it("disconnect kills process and marks disconnected", async () => {
    await transport.connect();
    await transport.disconnect();
    expect(transport.isConnected()).toBe(false);
    expect(mockProcess.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("send throws when not connected", async () => {
    await expect(transport.send("test/method")).rejects.toThrow(
      MCPTransportError,
    );
  });

  it("send writes JSON-RPC to stdin", async () => {
    await transport.connect();
    // Don't await — the response will never come in this test
    const sendPromise = transport.send("tools/list", { filter: "*" });

    expect(mockStdin.write).toHaveBeenCalledTimes(1);
    const written = mockStdin.write.mock.calls[0]![0] as string;
    const parsed = JSON.parse(written.trim());
    expect(parsed.jsonrpc).toBe("2.0");
    expect(parsed.method).toBe("tools/list");
    expect(parsed.params).toEqual({ filter: "*" });
    expect(typeof parsed.id).toBe("number");

    // Simulate response via stdout data handler
    const dataHandler = mockStdout.on.mock.calls.find(
      (c: unknown[]) => c[0] === "data",
    )![1] as (chunk: Buffer) => void;

    const response = JSON.stringify({
      jsonrpc: "2.0",
      id: parsed.id,
      result: { tools: [] },
    });
    dataHandler(Buffer.from(response + "\n"));

    const result = await sendPromise;
    expect(result).toEqual({ tools: [] });
  });

  it("dispatches notifications to handlers", async () => {
    await transport.connect();
    const handler = vi.fn();
    transport.onNotification(handler);

    const dataHandler = mockStdout.on.mock.calls.find(
      (c: unknown[]) => c[0] === "data",
    )![1] as (chunk: Buffer) => void;

    const notification = JSON.stringify({
      jsonrpc: "2.0",
      method: "server/progress",
      params: { percent: 50 },
    });
    dataHandler(Buffer.from(notification + "\n"));

    expect(handler).toHaveBeenCalledWith({
      method: "server/progress",
      params: { percent: 50 },
    });
  });

  it("rejects pending requests on process exit", async () => {
    await transport.connect();
    const sendPromise = transport.send("tools/list");

    // Simulate process exit
    const exitHandler = mockProcess.on.mock.calls.find(
      (c: unknown[]) => c[0] === "exit",
    )![1] as (code: number) => void;
    exitHandler(1);

    await expect(sendPromise).rejects.toThrow(MCPTransportError);
  });
});
