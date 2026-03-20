import { createLogger, } from "@stem-agent/shared";
import { MCPServerNotFoundError, MCPToolNotFoundError, MCPConnectionError, } from "./errors.js";
/**
 * Central registry for MCP servers.
 *
 * Implements {@link IMCPManager} — discovers, starts, stops, and
 * health-checks servers. Routes tool calls to the correct server
 * via an O(1) tool-name index.
 */
export class MCPManager {
    servers = new Map();
    toolIndex = new Map(); // toolName -> serverName
    configs;
    serverFactory;
    logger;
    constructor(opts) {
        this.configs = opts.configs ?? [];
        this.serverFactory = opts.serverFactory;
        this.logger = opts.logger ?? createLogger("mcp-manager");
    }
    /** @inheritdoc */
    async connectAll() {
        for (const cfg of this.configs) {
            if (!cfg.autoConnect)
                continue;
            await this.startServer(cfg);
        }
        this.logger.info({ count: this.servers.size }, "all auto-connect servers started");
    }
    /** @inheritdoc */
    async discoverCapabilities() {
        const tools = [];
        for (const server of this.servers.values()) {
            tools.push(...server.listTools());
        }
        return tools;
    }
    /** @inheritdoc */
    async callTool(toolName, args, serverName) {
        const targetServerName = serverName ?? this.toolIndex.get(toolName);
        if (!targetServerName) {
            throw new MCPToolNotFoundError(toolName);
        }
        const server = this.servers.get(targetServerName);
        if (!server) {
            throw new MCPServerNotFoundError(targetServerName);
        }
        this.logger.debug({ tool: toolName, server: targetServerName }, "routing tool call");
        return server.executeTool(toolName, args);
    }
    /** @inheritdoc */
    async dynamicConnect(config) {
        await this.startServer(config);
        this.logger.info({ server: config.name }, "dynamically connected MCP server");
    }
    /** @inheritdoc */
    async shutdown() {
        const names = [...this.servers.keys()];
        for (const name of names) {
            const server = this.servers.get(name);
            await server.stop();
            this.removeServerFromIndex(name);
            this.servers.delete(name);
        }
        this.logger.info("all MCP servers shut down");
    }
    /** @inheritdoc */
    async healthCheck() {
        const result = {};
        for (const [name, server] of this.servers) {
            try {
                result[name] = await server.healthCheck();
            }
            catch {
                result[name] = false;
            }
        }
        return result;
    }
    /** @inheritdoc */
    async listResources(serverName) {
        const resources = [];
        if (serverName) {
            const server = this.servers.get(serverName);
            if (!server)
                throw new MCPServerNotFoundError(serverName);
            resources.push(...server.listResources());
        }
        else {
            for (const server of this.servers.values()) {
                resources.push(...server.listResources());
            }
        }
        return resources;
    }
    /** @inheritdoc */
    async readResource(uri, serverName) {
        if (serverName) {
            const server = this.servers.get(serverName);
            if (!server)
                throw new MCPServerNotFoundError(serverName);
            return server.readResource(uri);
        }
        // Try each server until one handles the URI
        for (const server of this.servers.values()) {
            try {
                return await server.readResource(uri);
            }
            catch {
                // Server doesn't handle this URI, try next
            }
        }
        throw new MCPServerNotFoundError(`No server found for resource URI: ${uri}`);
    }
    /** @inheritdoc */
    setLogLevel(level) {
        this.logger.level = level;
    }
    /** Get a registered server by name (useful for tests / advanced usage). */
    getServer(name) {
        return this.servers.get(name);
    }
    /* ------------------------------------------------------------------ */
    /*  Private helpers                                                    */
    /* ------------------------------------------------------------------ */
    async startServer(config) {
        if (this.servers.has(config.name)) {
            this.logger.warn({ server: config.name }, "server already registered, skipping");
            return;
        }
        try {
            const server = await this.serverFactory(config);
            await server.start();
            this.servers.set(config.name, server);
            this.indexServerTools(server);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new MCPConnectionError(config.name, message, err instanceof Error ? err : undefined);
        }
    }
    indexServerTools(server) {
        for (const tool of server.listTools()) {
            this.toolIndex.set(tool.name, server.name);
        }
    }
    removeServerFromIndex(serverName) {
        for (const [toolName, sName] of this.toolIndex) {
            if (sName === serverName) {
                this.toolIndex.delete(toolName);
            }
        }
    }
}
//# sourceMappingURL=manager.js.map