import { type Logger } from "@stem-agent/shared";
import { type StemAgentClientOptions } from "../frameworks/sdk.js";
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
export declare class CLI {
    private readonly client;
    private readonly callerId;
    private readonly sessionId;
    private readonly log;
    private readonly history;
    private readonly input;
    private readonly output;
    private lastTaskId;
    constructor(opts?: CLIOptions);
    /** Start the interactive REPL. Returns when the user quits. */
    run(): Promise<void>;
    /** Process a single line of input. Exposed for testing. */
    handleInput(input: string): Promise<string | null>;
    private handleCommand;
    private sendChat;
    private showStatus;
    private cancelTask;
    private showHistory;
    private showMemory;
    private showHelp;
    private write;
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
export declare function runCLI(opts?: CLIOptions): Promise<void>;
//# sourceMappingURL=cli.d.ts.map