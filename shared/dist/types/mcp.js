import { z } from "zod";
// ---------------------------------------------------------------------------
// MCP Tool and Server types (from design doc Sec 4)
// ---------------------------------------------------------------------------
export const MCPTransport = z.enum(["stdio", "sse"]);
export const MCPServerConfigSchema = z.object({
    name: z.string(),
    transport: MCPTransport,
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    url: z.string().url().optional(), // for SSE transport
    capabilities: z.array(z.string()).default([]),
    autoConnect: z.boolean().default(true),
    env: z.record(z.string()).default({}),
});
export const MCPToolParameterSchema = z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().default(""),
    required: z.boolean().default(false),
});
export const MCPToolSchema = z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.array(MCPToolParameterSchema).default([]),
    serverName: z.string(),
});
export const MCPToolResultSchema = z.object({
    toolName: z.string(),
    success: z.boolean(),
    data: z.unknown(),
    error: z.string().optional(),
    durationMs: z.number().optional(),
});
export const MCPResourceSchema = z.object({
    uri: z.string(),
    name: z.string(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
});
//# sourceMappingURL=mcp.js.map