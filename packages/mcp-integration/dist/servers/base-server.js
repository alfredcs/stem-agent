"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseMCPServer = void 0;
const shared_1 = require("@stem-agent/shared");
const errors_js_1 = require("../errors.js");
/**
 * Abstract base class for all MCP servers in this layer.
 *
 * Subclasses implement {@link initialize} to register their tools via
 * {@link registerTool}. The manager calls {@link start}, {@link stop},
 * {@link listTools}, and {@link executeTool}.
 */
class BaseMCPServer {
    config;
    logger;
    tools = new Map();
    running = false;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger ?? (0, shared_1.createLogger)(`mcp-server:${config.name}`);
    }
    /** The unique name of this server (from config). */
    get name() {
        return this.config.name;
    }
    /** Whether this server has been started. */
    get isRunning() {
        return this.running;
    }
    /**
     * Start the server: run subclass initialization, then mark as running.
     * Subclasses should NOT override this — override {@link initialize} instead.
     */
    async start() {
        if (this.running)
            return;
        this.logger.info({ server: this.name }, "starting MCP server");
        await this.initialize();
        this.running = true;
    }
    /** Stop the server and clean up resources. */
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        await this.cleanup();
        this.logger.info({ server: this.name }, "stopped MCP server");
    }
    /** Health check — returns true if the server is running. Override for deeper checks. */
    async healthCheck() {
        return this.running;
    }
    /** Return all resources provided by this server. Override in subclasses that support resources. */
    listResources() {
        return [];
    }
    /** Read a resource by URI. Override in subclasses that support resources. */
    async readResource(_uri) {
        throw new shared_1.BaseError("Resources not supported by this server", {
            code: "NOT_SUPPORTED",
            statusCode: 501,
        });
    }
    /** Return all tools registered by this server. */
    listTools() {
        return [...this.tools.values()].map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            serverName: this.name,
        }));
    }
    /**
     * Execute a tool by name.
     * @returns An {@link MCPToolResult} with success/failure and timing.
     */
    async executeTool(toolName, args) {
        const entry = this.tools.get(toolName);
        if (!entry) {
            throw new errors_js_1.MCPToolNotFoundError(toolName, this.name);
        }
        const start = performance.now();
        try {
            const data = await entry.handler(args);
            return {
                toolName,
                success: true,
                data,
                durationMs: Math.round(performance.now() - start),
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                toolName,
                success: false,
                data: null,
                error: message,
                durationMs: Math.round(performance.now() - start),
            };
        }
    }
    /* ------------------------------------------------------------------ */
    /*  Protected helpers for subclasses                                   */
    /* ------------------------------------------------------------------ */
    /**
     * Register a tool that this server provides.
     * Called during {@link initialize}.
     */
    registerTool(name, description, parameters, handler) {
        if (this.tools.has(name)) {
            throw new errors_js_1.MCPToolExecutionError(name, `Tool "${name}" already registered on "${this.name}"`);
        }
        this.tools.set(name, { name, description, parameters, handler });
        this.logger.debug({ tool: name }, "registered tool");
    }
    /** Optional cleanup hook called by {@link stop}. Override as needed. */
    async cleanup() {
        /* no-op by default */
    }
}
exports.BaseMCPServer = BaseMCPServer;
//# sourceMappingURL=base-server.js.map