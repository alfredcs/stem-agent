import { type Logger } from "@stem-agent/shared";
import type { IMCPTransport, NotificationHandler } from "./base-transport.js";
/** Configuration for the SSE transport. */
export interface SSETransportOptions {
    url: string;
    headers?: Record<string, string>;
    logger?: Logger;
}
/**
 * MCP transport over HTTP Server-Sent Events.
 *
 * Sends JSON-RPC requests via POST and receives responses / notifications
 * via an SSE stream opened on connect.
 */
export declare class SSETransport implements IMCPTransport {
    private connected;
    private nextId;
    private abortController;
    private readonly pending;
    private readonly notificationHandlers;
    private readonly logger;
    private readonly url;
    private readonly headers;
    constructor(opts: SSETransportOptions);
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
    private readStream;
    private handleSSEEvent;
    private handleMessage;
    private rejectAllPending;
}
//# sourceMappingURL=sse-transport.d.ts.map