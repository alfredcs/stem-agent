import { BaseError } from "@stem-agent/shared";
/** Failure to connect or maintain connection to an MCP server. */
export class MCPConnectionError extends BaseError {
    constructor(serverName, reason, cause) {
        super(`Connection to MCP server "${serverName}" failed: ${reason}`, {
            code: "MCP_CONNECTION_ERROR",
            statusCode: 502,
            details: { serverName, reason },
            cause,
        });
    }
}
/** Requested tool does not exist in any connected server. */
export class MCPToolNotFoundError extends BaseError {
    constructor(toolName, serverName) {
        const msg = serverName
            ? `Tool "${toolName}" not found on server "${serverName}"`
            : `Tool "${toolName}" not found on any connected server`;
        super(msg, {
            code: "MCP_TOOL_NOT_FOUND",
            statusCode: 404,
            details: { toolName, serverName },
        });
    }
}
/** A tool invocation failed at runtime. */
export class MCPToolExecutionError extends BaseError {
    constructor(toolName, reason, cause) {
        super(`Tool "${toolName}" execution failed: ${reason}`, {
            code: "MCP_TOOL_EXECUTION_ERROR",
            statusCode: 500,
            details: { toolName, reason },
            cause,
        });
    }
}
/** Transport-level communication error. */
export class MCPTransportError extends BaseError {
    constructor(transport, reason, cause) {
        super(`MCP transport "${transport}" error: ${reason}`, {
            code: "MCP_TRANSPORT_ERROR",
            statusCode: 502,
            details: { transport, reason },
            cause,
        });
    }
}
/** Requested server does not exist in the registry. */
export class MCPServerNotFoundError extends BaseError {
    constructor(serverName) {
        super(`MCP server "${serverName}" not found in registry`, {
            code: "MCP_SERVER_NOT_FOUND",
            statusCode: 404,
            details: { serverName },
        });
    }
}
//# sourceMappingURL=errors.js.map