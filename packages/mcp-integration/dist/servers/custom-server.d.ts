import { type MCPServerConfig, type MCPToolParameter, type Logger } from "@stem-agent/shared";
import { BaseMCPServer, type ToolHandler } from "./base-server.js";
/**
 * Abstract base class for user-defined MCP server plugins.
 *
 * Plugin authors extend this and implement the lifecycle hooks.
 * The plugin is loaded by {@link CustomServerLoader} and wrapped
 * in a {@link CustomServer}.
 */
export declare abstract class AbstractCustomServer {
    /** Unique name for this custom server. */
    abstract readonly name: string;
    /** Called once when the plugin is loaded. Register tools here. */
    abstract onInit(): Promise<ToolRegistration[]>;
    /** Called when the server starts. Optional setup. */
    onStart(): Promise<void>;
    /** Called when the server stops. Optional cleanup. */
    onStop(): Promise<void>;
    /** Health check. Return true if healthy. */
    onHealthCheck(): Promise<boolean>;
}
/** A tool registration returned by a plugin's onInit(). */
export interface ToolRegistration {
    name: string;
    description: string;
    parameters: MCPToolParameter[];
    handler: ToolHandler;
}
/**
 * Discovers and loads custom server plugins from a directory.
 *
 * Each plugin module must default-export a class extending
 * {@link AbstractCustomServer}.
 */
export declare class CustomServerLoader {
    private readonly logger;
    constructor(logger?: Logger);
    /**
     * Load a single plugin from a module path.
     * @param modulePath Absolute path or package name to import.
     * @returns An instance of the plugin.
     */
    loadPlugin(modulePath: string): Promise<AbstractCustomServer>;
    /**
     * Load all plugins from an array of module paths.
     * Skips modules that fail to load (logs a warning).
     */
    loadAll(modulePaths: string[]): Promise<AbstractCustomServer[]>;
}
/**
 * MCP server that wraps a user-defined {@link AbstractCustomServer} plugin.
 *
 * Delegates lifecycle and tool registration to the plugin instance.
 */
export declare class CustomServer extends BaseMCPServer {
    private readonly plugin;
    constructor(config: MCPServerConfig, plugin: AbstractCustomServer, logger?: Logger);
    /** @inheritdoc */
    protected initialize(): Promise<void>;
    /** @inheritdoc */
    protected cleanup(): Promise<void>;
    /** @inheritdoc */
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=custom-server.d.ts.map