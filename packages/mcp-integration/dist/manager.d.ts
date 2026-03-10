import { type IMCPManager, type MCPTool, type MCPToolResult, type MCPResource, type MCPServerConfig, type Logger } from "@stem-agent/shared";
import type { BaseMCPServer } from "./servers/base-server.js";
/** Factory function that creates a server instance from a config. */
export type ServerFactory = (config: MCPServerConfig) => Promise<BaseMCPServer>;
/** Options for constructing the MCP Manager. */
export interface MCPManagerOptions {
    /** Server configs to connect on {@link MCPManager.connectAll}. */
    configs?: MCPServerConfig[];
    /** Factory that turns a config into a concrete server instance. */
    serverFactory: ServerFactory;
    logger?: Logger;
}
/**
 * Central registry for MCP servers.
 *
 * Implements {@link IMCPManager} — discovers, starts, stops, and
 * health-checks servers. Routes tool calls to the correct server
 * via an O(1) tool-name index.
 */
export declare class MCPManager implements IMCPManager {
    private readonly servers;
    private readonly toolIndex;
    private readonly configs;
    private readonly serverFactory;
    private readonly logger;
    constructor(opts: MCPManagerOptions);
    /** @inheritdoc */
    connectAll(): Promise<void>;
    /** @inheritdoc */
    discoverCapabilities(): Promise<MCPTool[]>;
    /** @inheritdoc */
    callTool(toolName: string, args: Record<string, unknown>, serverName?: string): Promise<MCPToolResult>;
    /** @inheritdoc */
    dynamicConnect(config: MCPServerConfig): Promise<void>;
    /** @inheritdoc */
    shutdown(): Promise<void>;
    /** @inheritdoc */
    healthCheck(): Promise<Record<string, boolean>>;
    /** @inheritdoc */
    listResources(serverName?: string): Promise<MCPResource[]>;
    /** @inheritdoc */
    readResource(uri: string, serverName?: string): Promise<unknown>;
    /** @inheritdoc */
    setLogLevel(level: string): void;
    /** Get a registered server by name (useful for tests / advanced usage). */
    getServer(name: string): BaseMCPServer | undefined;
    private startServer;
    private indexServerTools;
    private removeServerFromIndex;
}
//# sourceMappingURL=manager.d.ts.map