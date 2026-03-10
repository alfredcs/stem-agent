import {
  type MCPTool,
  type MCPToolResult,
  type MCPResource,
  type MCPServerConfig,
  type MCPToolParameter,
  createLogger,
  type Logger,
  BaseError,
} from "@stem-agent/shared";
import { MCPToolExecutionError, MCPToolNotFoundError } from "../errors.js";

/** Handler function invoked when a tool is called. */
export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown>;

/** Internal registration entry for a tool. */
interface ToolEntry {
  name: string;
  description: string;
  parameters: MCPToolParameter[];
  handler: ToolHandler;
}

/**
 * Abstract base class for all MCP servers in this layer.
 *
 * Subclasses implement {@link initialize} to register their tools via
 * {@link registerTool}. The manager calls {@link start}, {@link stop},
 * {@link listTools}, and {@link executeTool}.
 */
export abstract class BaseMCPServer {
  protected readonly config: MCPServerConfig;
  protected readonly logger: Logger;
  private readonly tools = new Map<string, ToolEntry>();
  private running = false;

  constructor(config: MCPServerConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? createLogger(`mcp-server:${config.name}`);
  }

  /** The unique name of this server (from config). */
  get name(): string {
    return this.config.name;
  }

  /** Whether this server has been started. */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Start the server: run subclass initialization, then mark as running.
   * Subclasses should NOT override this — override {@link initialize} instead.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.logger.info({ server: this.name }, "starting MCP server");
    await this.initialize();
    this.running = true;
  }

  /** Stop the server and clean up resources. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    await this.cleanup();
    this.logger.info({ server: this.name }, "stopped MCP server");
  }

  /** Health check — returns true if the server is running. Override for deeper checks. */
  async healthCheck(): Promise<boolean> {
    return this.running;
  }

  /** Return all resources provided by this server. Override in subclasses that support resources. */
  listResources(): MCPResource[] {
    return [];
  }

  /** Read a resource by URI. Override in subclasses that support resources. */
  async readResource(_uri: string): Promise<unknown> {
    throw new BaseError("Resources not supported by this server", {
      code: "NOT_SUPPORTED",
      statusCode: 501,
    });
  }

  /** Return all tools registered by this server. */
  listTools(): MCPTool[] {
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
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolResult> {
    const entry = this.tools.get(toolName);
    if (!entry) {
      throw new MCPToolNotFoundError(toolName, this.name);
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
    } catch (err) {
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
  protected registerTool(
    name: string,
    description: string,
    parameters: MCPToolParameter[],
    handler: ToolHandler,
  ): void {
    if (this.tools.has(name)) {
      throw new MCPToolExecutionError(name, `Tool "${name}" already registered on "${this.name}"`);
    }
    this.tools.set(name, { name, description, parameters, handler });
    this.logger.debug({ tool: name }, "registered tool");
  }

  /**
   * Subclasses override this to register tools and set up resources.
   * Called once by {@link start}.
   */
  protected abstract initialize(): Promise<void>;

  /** Optional cleanup hook called by {@link stop}. Override as needed. */
  protected async cleanup(): Promise<void> {
    /* no-op by default */
  }
}
