import { describe, it, expect, vi, beforeEach } from "vitest";
import { PassThrough } from "node:stream";
import { CLI } from "../human/cli.js";

// ---------------------------------------------------------------------------
// Mock fetch (used by StemAgentClient)
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
// Helpers
// ---------------------------------------------------------------------------

function createCLI(): { cli: CLI; output: PassThrough; getOutput: () => string } {
  const input = new PassThrough();
  const output = new PassThrough();
  let collected = "";
  output.on("data", (chunk: Buffer) => {
    collected += chunk.toString();
  });

  const cli = new CLI({
    baseUrl: "http://localhost:8000",
    callerId: "test-user",
    input,
    output,
  });

  return {
    cli,
    output,
    getOutput: () => collected,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CLI", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  // ---- handleInput: regular chat ------------------------------------------

  it("sends chat messages via the SDK", async () => {
    const { cli } = createCLI();

    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        task_id: "t1",
        status: "completed",
        content: "Hello back!",
      }),
    );

    const result = await cli.handleInput("Hello agent");
    expect(result).toBe("Hello back!");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  // ---- handleInput: /help -------------------------------------------------

  it("/help returns command list", async () => {
    const { cli, getOutput } = createCLI();
    const result = await cli.handleInput("/help");

    expect(result).toContain("/task");
    expect(result).toContain("/status");
    expect(result).toContain("/quit");
    expect(getOutput()).toContain("Commands:");
  });

  // ---- handleInput: /status -----------------------------------------------

  it("/status shows caller and session info", async () => {
    const { cli } = createCLI();
    const result = await cli.handleInput("/status");

    expect(result).toContain("test-user");
    expect(result).toContain("localhost:8000");
  });

  // ---- handleInput: /history ----------------------------------------------

  it("/history shows empty initially", async () => {
    const { cli } = createCLI();
    const result = await cli.handleInput("/history");
    expect(result).toBe("");
  });

  it("/history shows entries after chat", async () => {
    const { cli } = createCLI();

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ task_id: "t1", status: "completed", content: "reply" }),
    );
    await cli.handleInput("first message");

    const result = await cli.handleInput("/history");
    expect(result).toContain("[user] first message");
    expect(result).toContain("[agent] reply");
  });

  // ---- handleInput: /task -------------------------------------------------

  it("/task sends a chat message", async () => {
    const { cli } = createCLI();

    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        task_id: "t2",
        status: "completed",
        content: "task result",
      }),
    );

    const result = await cli.handleInput("/task analyze data");
    expect(result).toBe("task result");
  });

  it("/task without args shows usage", async () => {
    const { cli, getOutput } = createCLI();
    await cli.handleInput("/task");
    expect(getOutput()).toContain("Usage:");
  });

  // ---- handleInput: /cancel -----------------------------------------------

  it("/cancel shows placeholder message", async () => {
    const { cli } = createCLI();
    const result = await cli.handleInput("/cancel");
    expect(result).toContain("No active task");
  });

  // ---- handleInput: /memory -----------------------------------------------

  it("/memory fetches caller profile", async () => {
    const { cli } = createCLI();
    const profile = { callerId: "test-user", totalInteractions: 42 };
    mockFetch.mockResolvedValueOnce(jsonResponse(profile));

    const result = await cli.handleInput("/memory");
    expect(result).toContain("test-user");
    expect(result).toContain("42");
  });

  // ---- handleInput: unknown command ---------------------------------------

  it("unknown command shows error", async () => {
    const { cli, getOutput } = createCLI();
    await cli.handleInput("/foobar");
    expect(getOutput()).toContain("Unknown command");
  });

  // ---- handleInput: /quit -------------------------------------------------

  it("/quit prints goodbye", async () => {
    const { cli, getOutput } = createCLI();
    await cli.handleInput("/quit");
    expect(getOutput()).toContain("Goodbye");
  });

  // ---- error handling -----------------------------------------------------

  it("propagates errors from SDK", async () => {
    const { cli } = createCLI();
    mockFetch.mockRejectedValueOnce(new Error("network error"));
    await expect(cli.handleInput("fail message")).rejects.toThrow(
      "network error",
    );
  });
});
