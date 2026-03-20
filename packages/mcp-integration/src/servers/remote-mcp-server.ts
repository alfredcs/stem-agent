import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";

/**
 * MCP server that proxies to a remote MCP endpoint via HTTP (streamable HTTP transport).
 *
 * Uses the official @modelcontextprotocol/sdk to connect to remote MCP servers
 * (e.g., arxiv, hugging-face) and exposes their tools through the stem-agent
 * BaseMCPServer interface.
 */
export class RemoteMCPServer extends BaseMCPServer {
  private client: any;
  private transport: any;

  constructor(config: MCPServerConfig, logger?: Logger) {
    super(config, logger);
  }

  protected async initialize(): Promise<void> {
    const url = this.config.url;
    if (!url) {
      throw new Error(`RemoteMCPServer "${this.config.name}" requires a url in config`);
    }

    // Dynamic import to avoid hard dependency
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import(
      "@modelcontextprotocol/sdk/client/streamableHttp.js"
    );

    this.transport = new StreamableHTTPClientTransport(new URL(url));
    this.client = new Client({ name: `stem-agent/${this.config.name}`, version: "0.1.0" });

    await this.client.connect(this.transport);
    this.logger.info({ server: this.config.name, url }, "connected to remote MCP server");

    // Discover and register tools
    const result = await this.client.listTools();
    for (const tool of result.tools ?? []) {
      const params = Object.entries(tool.inputSchema?.properties ?? {}).map(
        ([name, schema]: [string, any]) => ({
          name,
          type: schema.type ?? "string",
          description: schema.description ?? "",
          required: (tool.inputSchema?.required ?? []).includes(name),
        }),
      );

      this.registerTool(tool.name, tool.description ?? "", params, async (args) => {
        const callResult = await this.client.callTool({ name: tool.name, arguments: args });
        // MCP tool results are arrays of content blocks
        const texts = (callResult.content ?? [])
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text);
        return texts.length === 1 ? texts[0] : texts.join("\n");
      });
    }

    this.logger.info(
      { server: this.config.name, toolCount: result.tools?.length ?? 0 },
      "registered remote tools",
    );
  }

  protected async cleanup(): Promise<void> {
    try {
      await this.client?.close();
    } catch {
      // Ignore close errors
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client?.ping();
      return true;
    } catch {
      return false;
    }
  }
}
