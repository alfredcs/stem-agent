/** Notification received from an MCP server. */
export interface MCPNotification {
    method: string;
    params?: unknown;
}
/** Handler for server-initiated notifications. */
export type NotificationHandler = (notification: MCPNotification) => void;
/**
 * Abstract transport interface for MCP server communication.
 * Implementations handle the specifics of stdio or SSE protocols.
 */
export interface IMCPTransport {
    /** Establish the transport connection. */
    connect(): Promise<void>;
    /** Tear down the transport connection. */
    disconnect(): Promise<void>;
    /** Send a JSON-RPC request and return the result. */
    send(method: string, params?: unknown): Promise<unknown>;
    /** Whether the transport is currently connected. */
    isConnected(): boolean;
    /** Register a handler for server-initiated notifications. */
    onNotification(handler: NotificationHandler): void;
}
//# sourceMappingURL=base-transport.d.ts.map