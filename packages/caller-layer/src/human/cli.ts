#!/usr/bin/env node
import * as readline from "node:readline";
import { randomUUID } from "node:crypto";
import { createLogger, type Logger } from "@stem-agent/shared";
import {
  StemAgentClient,
  type ChatResponse,
  type StemAgentClientOptions,
} from "../frameworks/sdk.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for launching the CLI. */
export interface CLIOptions {
  /** STEM agent base URL. Defaults to `STEM_AGENT_URL` env or `http://localhost:8000`. */
  baseUrl?: string;
  /** Caller identity. Defaults to `STEM_CALLER_ID` env or a random UUID. */
  callerId?: string;
  /** Custom SDK options (merged with above). */
  clientOptions?: Partial<StemAgentClientOptions>;
  /** Injected logger. */
  logger?: Logger;
  /** Custom input stream (for testing). */
  input?: NodeJS.ReadableStream;
  /** Custom output stream (for testing). */
  output?: NodeJS.WritableStream;
}

/** A stored history entry. */
export interface HistoryEntry {
  role: "user" | "agent";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * Interactive REPL CLI for chatting with a STEM agent.
 *
 * Commands:
 * - `/task <message>` — send a task
 * - `/status`         — show connection status
 * - `/cancel`         — (placeholder) cancel current task
 * - `/history`        — show conversation history
 * - `/memory [id]`    — show caller profile
 * - `/help`           — show help
 * - `/quit`           — exit
 *
 * Any other input is sent as a chat message.
 */
export class CLI {
  private readonly client: StemAgentClient;
  private readonly callerId: string;
  private readonly sessionId: string;
  private readonly log: Logger;
  private readonly history: HistoryEntry[] = [];
  private readonly input: NodeJS.ReadableStream;
  private readonly output: NodeJS.WritableStream;
  private lastTaskId: string | null = null;

  constructor(opts: CLIOptions = {}) {
    const baseUrl =
      opts.baseUrl ?? process.env["STEM_AGENT_URL"] ?? "http://localhost:8000";
    this.callerId =
      opts.callerId ?? process.env["STEM_CALLER_ID"] ?? randomUUID();
    this.sessionId = randomUUID();
    this.log = opts.logger ?? createLogger("stem-cli");
    this.input = opts.input ?? process.stdin;
    this.output = opts.output ?? process.stdout;

    this.client = new StemAgentClient({
      baseUrl,
      ...opts.clientOptions,
      logger: this.log,
    });
  }

  /** Start the interactive REPL. Returns when the user quits. */
  async run(): Promise<void> {
    const rl = readline.createInterface({
      input: this.input,
      output: this.output as NodeJS.WritableStream,
      prompt: "stem> ",
    });

    this.write("STEM Agent CLI — type /help for commands\n");
    rl.prompt();

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) {
        rl.prompt();
        continue;
      }

      try {
        await this.handleInput(trimmed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.write(`Error: ${msg}\n`);
      }

      // /quit was handled inside handleInput by closing the client
      if (trimmed === "/quit") {
        rl.close();
        return;
      }

      rl.prompt();
    }
  }

  /** Process a single line of input. Exposed for testing. */
  async handleInput(input: string): Promise<string | null> {
    if (input.startsWith("/")) {
      return this.handleCommand(input);
    }
    return this.sendChat(input);
  }

  // ---- Commands -----------------------------------------------------------

  private async handleCommand(input: string): Promise<string | null> {
    const [cmd, ...rest] = input.split(/\s+/);
    const arg = rest.join(" ");

    switch (cmd) {
      case "/task":
        if (!arg) {
          this.write("Usage: /task <message>\n");
          return null;
        }
        return this.sendChat(arg);

      case "/status":
        return this.showStatus();

      case "/cancel":
        return this.cancelTask();

      case "/history":
        return this.showHistory();

      case "/memory":
        return this.showMemory(arg || this.callerId);

      case "/help":
        return this.showHelp();

      case "/quit":
        this.client.close();
        this.write("Goodbye.\n");
        return null;

      default:
        this.write(`Unknown command: ${cmd}. Type /help for commands.\n`);
        return null;
    }
  }

  private async sendChat(message: string): Promise<string> {
    this.history.push({ role: "user", content: message, timestamp: Date.now() });
    this.write("[thinking...]\n");

    const res: ChatResponse = await this.client.chat({
      message,
      callerId: this.callerId,
      sessionId: this.sessionId,
    });

    this.lastTaskId = res.task_id;
    const content = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    this.history.push({ role: "agent", content, timestamp: Date.now() });
    this.write(`${content}\n`);
    return content;
  }

  private showStatus(): string {
    const info = [
      `Caller:  ${this.callerId}`,
      `Session: ${this.sessionId}`,
      `Agent:   ${(this.client as unknown as { baseUrl: string }).baseUrl ?? "unknown"}`,
      `Last task: ${this.lastTaskId ?? "none"}`,
    ].join("\n");
    this.write(info + "\n");
    return info;
  }

  private cancelTask(): string {
    const msg = this.lastTaskId
      ? `Cancel not yet implemented for task ${this.lastTaskId}`
      : "No active task to cancel";
    this.write(msg + "\n");
    return msg;
  }

  private showHistory(): string {
    if (this.history.length === 0) {
      this.write("No conversation history.\n");
      return "";
    }
    const lines = this.history.map(
      (h) => `[${h.role}] ${h.content}`,
    );
    const text = lines.join("\n");
    this.write(text + "\n");
    return text;
  }

  private async showMemory(callerId: string): Promise<string> {
    const profile = await this.client.getCallerProfile(callerId);
    const text = JSON.stringify(profile, null, 2);
    this.write(text + "\n");
    return text;
  }

  private showHelp(): string {
    const help = [
      "Commands:",
      "  /task <msg>    Send a task to the agent",
      "  /status        Show connection info",
      "  /cancel        Cancel the current task",
      "  /history       Show conversation history",
      "  /memory [id]   Show caller profile (default: your ID)",
      "  /help          Show this help",
      "  /quit          Exit the CLI",
      "",
      "Any other input is sent as a chat message.",
    ].join("\n");
    this.write(help + "\n");
    return help;
  }

  // ---- I/O ----------------------------------------------------------------

  private write(text: string): void {
    (this.output as NodeJS.WritableStream).write(text);
  }
}

/**
 * Main entry point — call from a bin script or directly.
 *
 * @example
 * ```ts
 * import { runCLI } from "@stem-agent/caller-layer";
 * runCLI();
 * ```
 */
export async function runCLI(opts?: CLIOptions): Promise<void> {
  const cli = new CLI(opts);
  await cli.run();
}
