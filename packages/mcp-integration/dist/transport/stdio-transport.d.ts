import { type Logger } from "@stem-agent/shared";
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
export declare class StdioTransport implements IMCPTransport {
    private process;
    private connected;
    private nextId;
    private readonly pending;
    private readonly notificationHandlers;
    private buffer;
    private readonly logger;
    private readonly command;
    private readonly args;
    private readonly env;
    constructor(opts: StdioTransportOptions);
    /** @inheritdoc */
    connect(): Promise<void>;
    /** @inheritdoc */
    disconnect(): Promise<void>;
    /** @inheritdoc */
    send(method: string, params?: unknown): Promise<unknown>;
    /** @inheritdoc */
    isConnected(): boolean;
    /** @inheritdoc */
    onNotification(handler: NotificationHandler): void;
    private handleData;
    private handleMessage;
    private rejectAllPending;
}
//# sourceMappingURL=stdio-transport.d.ts.map