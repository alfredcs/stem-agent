import { createLogger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";
/**
 * Abstract base class for user-defined MCP server plugins.
 *
 * Plugin authors extend this and implement the lifecycle hooks.
 * The plugin is loaded by {@link CustomServerLoader} and wrapped
 * in a {@link CustomServer}.
 */
export class AbstractCustomServer {
    /** Called when the server starts. Optional setup. */
    async onStart() {
        /* no-op by default */
    }
    /** Called when the server stops. Optional cleanup. */
    async onStop() {
        /* no-op by default */
    }
    /** Health check. Return true if healthy. */
    async onHealthCheck() {
        return true;
    }
}
/**
 * Discovers and loads custom server plugins from a directory.
 *
 * Each plugin module must default-export a class extending
 * {@link AbstractCustomServer}.
 */
export class CustomServerLoader {
    logger;
    constructor(logger) {
        this.logger = logger ?? createLogger("custom-server-loader");
    }
    /**
     * Load a single plugin from a module path.
     * @param modulePath Absolute path or package name to import.
     * @returns An instance of the plugin.
     */
    async loadPlugin(modulePath) {
        try {
            const mod = (await import(modulePath));
            const PluginClass = mod.default;
            if (!PluginClass || typeof PluginClass !== "function") {
                throw new Error(`Module "${modulePath}" does not default-export a class`);
            }
            const instance = new PluginClass();
            this.logger.info({ plugin: instance.name, modulePath }, "loaded custom server plugin");
            return instance;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error({ modulePath, err: message }, "failed to load plugin");
            throw err;
        }
    }
    /**
     * Load all plugins from an array of module paths.
     * Skips modules that fail to load (logs a warning).
     */
    async loadAll(modulePaths) {
        const plugins = [];
        for (const p of modulePaths) {
            try {
                plugins.push(await this.loadPlugin(p));
            }
            catch {
                // Already logged in loadPlugin
            }
        }
        return plugins;
    }
}
/**
 * MCP server that wraps a user-defined {@link AbstractCustomServer} plugin.
 *
 * Delegates lifecycle and tool registration to the plugin instance.
 */
export class CustomServer extends BaseMCPServer {
    plugin;
    constructor(config, plugin, logger) {
        super(config, logger);
        this.plugin = plugin;
    }
    /** @inheritdoc */
    async initialize() {
        const tools = await this.plugin.onInit();
        for (const t of tools) {
            this.registerTool(t.name, t.description, t.parameters, t.handler);
        }
        await this.plugin.onStart();
    }
    /** @inheritdoc */
    async cleanup() {
        await this.plugin.onStop();
    }
    /** @inheritdoc */
    async healthCheck() {
        if (!this.isRunning)
            return false;
        return this.plugin.onHealthCheck();
    }
}
//# sourceMappingURL=custom-server.js.map