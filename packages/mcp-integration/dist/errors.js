"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerNotFoundError = exports.MCPTransportError = exports.MCPToolExecutionError = exports.MCPToolNotFoundError = exports.MCPConnectionError = void 0;
const shared_1 = require("@stem-agent/shared");
/** Failure to connect or maintain connection to an MCP server. */
class MCPConnectionError extends shared_1.BaseError {
    constructor(serverName, reason, cause) {
        super(`Connection to MCP server "${serverName}" failed: ${reason}`, {
            code: "MCP_CONNECTION_ERROR",
            statusCode: 502,
            details: { serverName, reason },
            cause,
        });
    }
}
exports.MCPConnectionError = MCPConnectionError;
/** Requested tool does not exist in any connected server. */
class MCPToolNotFoundError extends shared_1.BaseError {
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
exports.MCPToolNotFoundError = MCPToolNotFoundError;
/** A tool invocation failed at runtime. */
class MCPToolExecutionError extends shared_1.BaseError {
    constructor(toolName, reason, cause) {
        super(`Tool "${toolName}" execution failed: ${reason}`, {
            code: "MCP_TOOL_EXECUTION_ERROR",
            statusCode: 500,
            details: { toolName, reason },
            cause,
        });
    }
}
exports.MCPToolExecutionError = MCPToolExecutionError;
/** Transport-level communication error. */
class MCPTransportError extends shared_1.BaseError {
    constructor(transport, reason, cause) {
        super(`MCP transport "${transport}" error: ${reason}`, {
            code: "MCP_TRANSPORT_ERROR",
            statusCode: 502,
            details: { transport, reason },
            cause,
        });
    }
}
exports.MCPTransportError = MCPTransportError;
/** Requested server does not exist in the registry. */
class MCPServerNotFoundError extends shared_1.BaseError {
    constructor(serverName) {
        super(`MCP server "${serverName}" not found in registry`, {
            code: "MCP_SERVER_NOT_FOUND",
            statusCode: 404,
            details: { serverName },
        });
    }
}
exports.MCPServerNotFoundError = MCPServerNotFoundError;
//# sourceMappingURL=errors.js.map