import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IStemAgent, IMemoryManager, IMCPManager, DomainPersona } from "@stem-agent/shared";
export interface StemMCPServerOptions {
    agent: IStemAgent;
    memoryManager: IMemoryManager;
    mcpManager: IMCPManager;
    persona?: DomainPersona;
}
export declare class StemMCPServer {
    private readonly mcp;
    private readonly agent;
    private readonly memory;
    private readonly mcpManager;
    private readonly persona?;
    constructor(opts: StemMCPServerOptions);
    /** Start the MCP server on stdio transport. */
    start(): Promise<void>;
    /** Get the underlying McpServer for custom transport (e.g., SSE). */
    getServer(): McpServer;
    private registerTools;
}
//# sourceMappingURL=stem-mcp-server.d.ts.map