import { type MCPTool, type MCPToolResult, type MCPResource, type MCPServerConfig, type MCPToolParameter, type Logger } from "@stem-agent/shared";
/** Handler function invoked when a tool is called. */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
/**
 * Abstract base class for all MCP servers in this layer.
 *
 * Subclasses implement {@link initialize} to register their tools via
 * {@link registerTool}. The manager calls {@link start}, {@link stop},
 * {@link listTools}, and {@link executeTool}.
 */
export declare abstract class BaseMCPServer {
    protected readonly config: MCPServerConfig;
    protected readonly logger: Logger;
    private readonly tools;
    private running;
    constructor(config: MCPServerConfig, logger?: Logger);
    /** The unique name of this server (from config). */
    get name(): string;
    /** Whether this server has been started. */
    get isRunning(): boolean;
    /**
     * Start the server: run subclass initialization, then mark as running.
     * Subclasses should NOT override this — override {@link initialize} instead.
     */
    start(): Promise<void>;
    /** Stop the server and clean up resources. */
    stop(): Promise<void>;
    /** Health check — returns true if the server is running. Override for deeper checks. */
    healthCheck(): Promise<boolean>;
    /** Return all resources provided by this server. Override in subclasses that support resources. */
    listResources(): MCPResource[];
    /** Read a resource by URI. Override in subclasses that support resources. */
    readResource(_uri: string): Promise<unknown>;
    /** Return all tools registered by this server. */
    listTools(): MCPTool[];
    /**
     * Execute a tool by name.
     * @returns An {@link MCPToolResult} with success/failure and timing.
     */
    executeTool(toolName: string, args: Record<string, unknown>): Promise<MCPToolResult>;
    /**
     * Register a tool that this server provides.
     * Called during {@link initialize}.
     */
    protected registerTool(name: string, description: string, parameters: MCPToolParameter[], handler: ToolHandler): void;
    /**
     * Subclasses override this to register tools and set up resources.
     * Called once by {@link start}.
     */
    protected abstract initialize(): Promise<void>;
    /** Optional cleanup hook called by {@link stop}. Override as needed. */
    protected cleanup(): Promise<void>;
}
//# sourceMappingURL=base-server.d.ts.map