import { BaseError } from "@stem-agent/shared";
/** Failure to connect or maintain connection to an MCP server. */
export declare class MCPConnectionError extends BaseError {
    constructor(serverName: string, reason: string, cause?: Error);
}
/** Requested tool does not exist in any connected server. */
export declare class MCPToolNotFoundError extends BaseError {
    constructor(toolName: string, serverName?: string);
}
/** A tool invocation failed at runtime. */
export declare class MCPToolExecutionError extends BaseError {
    constructor(toolName: string, reason: string, cause?: Error);
}
/** Transport-level communication error. */
export declare class MCPTransportError extends BaseError {
    constructor(transport: string, reason: string, cause?: Error);
}
/** Requested server does not exist in the registry. */
export declare class MCPServerNotFoundError extends BaseError {
    constructor(serverName: string);
}
//# sourceMappingURL=errors.d.ts.map