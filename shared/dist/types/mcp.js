"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPResourceSchema = exports.MCPToolResultSchema = exports.MCPToolSchema = exports.MCPToolParameterSchema = exports.MCPServerConfigSchema = exports.MCPTransport = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// MCP Tool and Server types (from design doc Sec 4)
// ---------------------------------------------------------------------------
exports.MCPTransport = zod_1.z.enum(["stdio", "sse"]);
exports.MCPServerConfigSchema = zod_1.z.object({
    name: zod_1.z.string(),
    transport: exports.MCPTransport,
    command: zod_1.z.string().optional(),
    args: zod_1.z.array(zod_1.z.string()).default([]),
    url: zod_1.z.string().url().optional(), // for SSE transport
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    autoConnect: zod_1.z.boolean().default(true),
    env: zod_1.z.record(zod_1.z.string()).default({}),
});
exports.MCPToolParameterSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    description: zod_1.z.string().default(""),
    required: zod_1.z.boolean().default(false),
});
exports.MCPToolSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    parameters: zod_1.z.array(exports.MCPToolParameterSchema).default([]),
    serverName: zod_1.z.string(),
});
exports.MCPToolResultSchema = zod_1.z.object({
    toolName: zod_1.z.string(),
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown(),
    error: zod_1.z.string().optional(),
    durationMs: zod_1.z.number().optional(),
});
exports.MCPResourceSchema = zod_1.z.object({
    uri: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    mimeType: zod_1.z.string().optional(),
});
//# sourceMappingURL=mcp.js.map