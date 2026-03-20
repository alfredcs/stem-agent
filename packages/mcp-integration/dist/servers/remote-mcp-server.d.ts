import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";
/**
 * MCP server that proxies to a remote MCP endpoint via HTTP (streamable HTTP transport).
 *
 * Uses the official @modelcontextprotocol/sdk to connect to remote MCP servers
 * (e.g., arxiv, hugging-face) and exposes their tools through the stem-agent
 * BaseMCPServer interface.
 */
export declare class RemoteMCPServer extends BaseMCPServer {
    private client;
    private transport;
    constructor(config: MCPServerConfig, logger?: Logger);
    protected initialize(): Promise<void>;
    protected cleanup(): Promise<void>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=remote-mcp-server.d.ts.map