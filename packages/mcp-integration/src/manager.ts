import {
  type IMCPManager,
  type MCPTool,
  type MCPToolResult,
  type MCPResource,
  type MCPServerConfig,
  createLogger,
  type Logger,
} from "@stem-agent/shared";
import {
  MCPServerNotFoundError,
  MCPToolNotFoundError,
  MCPConnectionError,
} from "./errors.js";
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
export class MCPManager implements IMCPManager {
  private readonly servers = new Map<string, BaseMCPServer>();
  private readonly toolIndex = new Map<string, string>(); // toolName -> serverName
  private readonly configs: MCPServerConfig[];
  private readonly serverFactory: ServerFactory;
  private readonly logger: Logger;

  constructor(opts: MCPManagerOptions) {
    this.configs = opts.configs ?? [];
    this.serverFactory = opts.serverFactory;
    this.logger = opts.logger ?? createLogger("mcp-manager");
  }

  /** @inheritdoc */
  async connectAll(): Promise<void> {
    for (const cfg of this.configs) {
      if (!cfg.autoConnect) continue;
      try {
        await this.startServer(cfg);
      } catch (err) {
        this.logger.warn(
          { server: cfg.name, err },
          "failed to connect MCP server, skipping",
        );
      }
    }
    this.logger.info(
      { count: this.servers.size },
      "all auto-connect servers started",
    );
  }

  /** @inheritdoc */
  async discoverCapabilities(): Promise<MCPTool[]> {
    const tools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      tools.push(...server.listTools());
    }
    return tools;
  }

  /** @inheritdoc */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    serverName?: string,
  ): Promise<MCPToolResult> {
    const targetServerName = serverName ?? this.toolIndex.get(toolName);
    if (!targetServerName) {
      throw new MCPToolNotFoundError(toolName);
    }

    const server = this.servers.get(targetServerName);
    if (!server) {
      throw new MCPServerNotFoundError(targetServerName);
    }

    this.logger.debug(
      { tool: toolName, server: targetServerName },
      "routing tool call",
    );
    return server.executeTool(toolName, args);
  }

  /** @inheritdoc */
  async dynamicConnect(config: MCPServerConfig): Promise<void> {
    await this.startServer(config);
    this.logger.info(
      { server: config.name },
      "dynamically connected MCP server",
    );
  }

  /** @inheritdoc */
  async shutdown(): Promise<void> {
    const names = [...this.servers.keys()];
    for (const name of names) {
      const server = this.servers.get(name)!;
      await server.stop();
      this.removeServerFromIndex(name);
      this.servers.delete(name);
    }
    this.logger.info("all MCP servers shut down");
  }

  /** @inheritdoc */
  async healthCheck(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const [name, server] of this.servers) {
      try {
        result[name] = await server.healthCheck();
      } catch {
        result[name] = false;
      }
    }
    return result;
  }

  /** @inheritdoc */
  async listResources(serverName?: string): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];
    if (serverName) {
      const server = this.servers.get(serverName);
      if (!server) throw new MCPServerNotFoundError(serverName);
      resources.push(...server.listResources());
    } else {
      for (const server of this.servers.values()) {
        resources.push(...server.listResources());
      }
    }
    return resources;
  }

  /** @inheritdoc */
  async readResource(uri: string, serverName?: string): Promise<unknown> {
    if (serverName) {
      const server = this.servers.get(serverName);
      if (!server) throw new MCPServerNotFoundError(serverName);
      return server.readResource(uri);
    }

    // Try each server until one handles the URI
    for (const server of this.servers.values()) {
      try {
        return await server.readResource(uri);
      } catch {
        // Server doesn't handle this URI, try next
      }
    }
    throw new MCPServerNotFoundError(`No server found for resource URI: ${uri}`);
  }

  /** @inheritdoc */
  setLogLevel(level: string): void {
    this.logger.level = level;
  }

  /** Get a registered server by name (useful for tests / advanced usage). */
  getServer(name: string): BaseMCPServer | undefined {
    return this.servers.get(name);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async startServer(config: MCPServerConfig): Promise<void> {
    if (this.servers.has(config.name)) {
      this.logger.warn(
        { server: config.name },
        "server already registered, skipping",
      );
      return;
    }

    try {
      const server = await this.serverFactory(config);
      await server.start();
      this.servers.set(config.name, server);
      this.indexServerTools(server);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPConnectionError(config.name, message, err instanceof Error ? err : undefined);
    }
  }

  private indexServerTools(server: BaseMCPServer): void {
    for (const tool of server.listTools()) {
      this.toolIndex.set(tool.name, server.name);
    }
  }

  private removeServerFromIndex(serverName: string): void {
    for (const [toolName, sName] of this.toolIndex) {
      if (sName === serverName) {
        this.toolIndex.delete(toolName);
      }
    }
  }
}
