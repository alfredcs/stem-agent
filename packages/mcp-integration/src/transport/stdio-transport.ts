import { type ChildProcess, spawn } from "node:child_process";
import { createLogger, type Logger } from "@stem-agent/shared";
import { MCPTransportError } from "../errors.js";
import type { IMCPTransport, NotificationHandler } from "./base-transport.js";

/** Configuration for the stdio transport. */
export interface StdioTransportOptions {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  logger?: Logger;
}

/**
 * MCP transport over child-process stdio using JSON-RPC 2.0.
 *
 * Spawns the MCP server as a subprocess and communicates via
 * newline-delimited JSON on stdin/stdout.
 */
export class StdioTransport implements IMCPTransport {
  private process: ChildProcess | null = null;
  private connected = false;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private readonly notificationHandlers: NotificationHandler[] = [];
  private buffer = "";
  private readonly logger: Logger;
  private readonly command: string;
  private readonly args: string[];
  private readonly env: Record<string, string>;

  constructor(opts: StdioTransportOptions) {
    this.command = opts.command;
    this.args = opts.args ?? [];
    this.env = opts.env ?? {};
    this.logger = opts.logger ?? createLogger("stdio-transport");
  }

  /** @inheritdoc */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.process = spawn(this.command, this.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.env },
    });

    this.process.stdout?.on("data", (chunk: Buffer) => {
      this.handleData(chunk.toString());
    });

    this.process.stderr?.on("data", (chunk: Buffer) => {
      this.logger.warn({ stderr: chunk.toString() }, "server stderr");
    });

    this.process.on("exit", (code) => {
      this.connected = false;
      this.rejectAllPending(`Process exited with code ${code}`);
    });

    this.process.on("error", (err) => {
      this.connected = false;
      this.rejectAllPending(err.message);
    });

    this.connected = true;
    this.logger.info({ command: this.command }, "stdio transport connected");
  }

  /** @inheritdoc */
  async disconnect(): Promise<void> {
    if (!this.connected || !this.process) return;
    this.connected = false;
    this.rejectAllPending("Transport disconnecting");
    this.process.kill("SIGTERM");
    this.process = null;
    this.logger.info("stdio transport disconnected");
  }

  /** @inheritdoc */
  async send(method: string, params?: unknown): Promise<unknown> {
    if (!this.connected || !this.process?.stdin) {
      throw new MCPTransportError("stdio", "Transport not connected");
    }

    const id = this.nextId++;
    const request = { jsonrpc: "2.0", id, method, params };

    return new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  /** @inheritdoc */
  isConnected(): boolean {
    return this.connected;
  }

  /** @inheritdoc */
  onNotification(handler: NotificationHandler): void {
    this.notificationHandlers.push(handler);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private handleData(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split("\n");
    // Keep the last (possibly incomplete) segment in the buffer.
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as Record<string, unknown>;
        this.handleMessage(msg);
      } catch {
        this.logger.warn({ line: trimmed }, "non-JSON line from server");
      }
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    // JSON-RPC response (has id)
    if ("id" in msg && typeof msg["id"] === "number") {
      const pending = this.pending.get(msg["id"]);
      if (!pending) return;
      this.pending.delete(msg["id"]);
      if ("error" in msg) {
        const err = msg["error"] as { message?: string };
        pending.reject(
          new MCPTransportError("stdio", err.message ?? "Unknown RPC error"),
        );
      } else {
        pending.resolve(msg["result"]);
      }
      return;
    }

    // Notification (no id)
    if ("method" in msg && typeof msg["method"] === "string") {
      for (const handler of this.notificationHandlers) {
        handler({ method: msg["method"], params: msg["params"] });
      }
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, { reject }] of this.pending) {
      reject(new MCPTransportError("stdio", reason));
    }
    this.pending.clear();
  }
}
