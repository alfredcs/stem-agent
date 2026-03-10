import { z } from "zod";
export declare const MCPTransport: z.ZodEnum<["stdio", "sse"]>;
export type MCPTransport = z.infer<typeof MCPTransport>;
export declare const MCPServerConfigSchema: z.ZodObject<{
    name: z.ZodString;
    transport: z.ZodEnum<["stdio", "sse"]>;
    command: z.ZodOptional<z.ZodString>;
    args: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    url: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    autoConnect: z.ZodDefault<z.ZodBoolean>;
    env: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    transport: "stdio" | "sse";
    args: string[];
    capabilities: string[];
    autoConnect: boolean;
    env: Record<string, string>;
    command?: string | undefined;
    url?: string | undefined;
}, {
    name: string;
    transport: "stdio" | "sse";
    command?: string | undefined;
    args?: string[] | undefined;
    url?: string | undefined;
    capabilities?: string[] | undefined;
    autoConnect?: boolean | undefined;
    env?: Record<string, string> | undefined;
}>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export declare const MCPToolParameterSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: string;
    description: string;
    required: boolean;
}, {
    name: string;
    type: string;
    description?: string | undefined;
    required?: boolean | undefined;
}>;
export type MCPToolParameter = z.infer<typeof MCPToolParameterSchema>;
export declare const MCPToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    parameters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        description: z.ZodDefault<z.ZodString>;
        required: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: string;
        description: string;
        required: boolean;
    }, {
        name: string;
        type: string;
        description?: string | undefined;
        required?: boolean | undefined;
    }>, "many">>;
    serverName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    parameters: {
        name: string;
        type: string;
        description: string;
        required: boolean;
    }[];
    serverName: string;
}, {
    name: string;
    description: string;
    serverName: string;
    parameters?: {
        name: string;
        type: string;
        description?: string | undefined;
        required?: boolean | undefined;
    }[] | undefined;
}>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export declare const MCPToolResultSchema: z.ZodObject<{
    toolName: z.ZodString;
    success: z.ZodBoolean;
    data: z.ZodUnknown;
    error: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    toolName: string;
    success: boolean;
    data?: unknown;
    error?: string | undefined;
    durationMs?: number | undefined;
}, {
    toolName: string;
    success: boolean;
    data?: unknown;
    error?: string | undefined;
    durationMs?: number | undefined;
}>;
export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;
export declare const MCPResourceSchema: z.ZodObject<{
    uri: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    uri: string;
    description?: string | undefined;
    mimeType?: string | undefined;
}, {
    name: string;
    uri: string;
    description?: string | undefined;
    mimeType?: string | undefined;
}>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
/** Interface that the MCP Integration Layer exposes to upper layers. */
export interface IMCPManager {
    /** Connect to all configured MCP servers. */
    connectAll(): Promise<void>;
    /** Discover available tools across all connected servers. */
    discoverCapabilities(): Promise<MCPTool[]>;
    /** Invoke a tool by name, auto-routing to the correct server. */
    callTool(toolName: string, args: Record<string, unknown>, serverName?: string): Promise<MCPToolResult>;
    /** Dynamically connect a new MCP server at runtime. */
    dynamicConnect(config: MCPServerConfig): Promise<void>;
    /** Gracefully disconnect all servers. */
    shutdown(): Promise<void>;
    /** Health check all connected servers. */
    healthCheck(): Promise<Record<string, boolean>>;
    /** List resources across all connected servers (or a specific one). */
    listResources(serverName?: string): Promise<MCPResource[]>;
    /** Read a resource by URI, optionally targeting a specific server. */
    readResource(uri: string, serverName?: string): Promise<unknown>;
    /** Set the log level for the MCP manager. */
    setLogLevel(level: string): void;
}
//# sourceMappingURL=mcp.d.ts.map