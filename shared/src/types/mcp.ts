import { z } from "zod";

// ---------------------------------------------------------------------------
// MCP Tool and Server types (from design doc Sec 4)
// ---------------------------------------------------------------------------

export const MCPTransport = z.enum(["stdio", "sse"]);
export type MCPTransport = z.infer<typeof MCPTransport>;

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

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

export const MCPToolParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

export type MCPToolParameter = z.infer<typeof MCPToolParameterSchema>;

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.array(MCPToolParameterSchema).default([]),
  serverName: z.string(),
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

export const MCPToolResultSchema = z.object({
  toolName: z.string(),
  success: z.boolean(),
  data: z.unknown(),
  error: z.string().optional(),
  durationMs: z.number().optional(),
});

export type MCPToolResult = z.infer<typeof MCPToolResultSchema>;

export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

export type MCPResource = z.infer<typeof MCPResourceSchema>;

// ---------------------------------------------------------------------------
// MCP Manager Interface — Layer 5 public contract
// ---------------------------------------------------------------------------

/** Interface that the MCP Integration Layer exposes to upper layers. */
export interface IMCPManager {
  /** Connect to all configured MCP servers. */
  connectAll(): Promise<void>;

  /** Discover available tools across all connected servers. */
  discoverCapabilities(): Promise<MCPTool[]>;

  /** Invoke a tool by name, auto-routing to the correct server. */
  callTool(
    toolName: string,
    args: Record<string, unknown>,
    serverName?: string,
  ): Promise<MCPToolResult>;

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
