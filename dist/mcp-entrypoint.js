/**
 * MCP Entrypoint — starts a stem-agent instance as an MCP server.
 *
 * Claude Code connects to this via stdio transport. If DOMAIN_PERSONA
 * is set, the agent is differentiated with that persona config.
 *
 * Usage:
 *   node --env-file=.env dist/mcp-entrypoint.js
 *
 * Or with a domain persona:
 *   DOMAIN_PERSONA=domains/finance/persona.json node --env-file=.env dist/mcp-entrypoint.js
 */
import { AgentCoreConfigSchema, StemAgent } from "@stem-agent/agent-core";
import { MCPManager, RemoteMCPServer } from "@stem-agent/mcp-integration";
import { MemoryManager, EpisodicMemory, SemanticMemory, ProceduralMemory, UserContextManager, InMemoryEpisodicStore, InMemorySemanticStore, InMemoryProceduralStore, InMemoryUserContextStore, NoOpEmbeddingProvider, OpenAIEmbeddingProvider, } from "@stem-agent/memory-system";
import { StemMCPServer } from "@stem-agent/mcp-server";
import { DomainPersonaSchema } from "@stem-agent/shared";
import { readFileSync } from "node:fs";
async function main() {
    // Load domain persona if configured
    let persona;
    const personaPath = process.env.DOMAIN_PERSONA;
    if (personaPath) {
        const raw = JSON.parse(readFileSync(personaPath, "utf-8"));
        persona = DomainPersonaSchema.parse(raw);
        // Write to stderr (stdout is reserved for MCP stdio transport)
        process.stderr.write(`[mcp-entrypoint] Loaded persona: ${persona.name}\n`);
    }
    // Parse config
    const config = AgentCoreConfigSchema.parse({});
    // Embedding provider
    const embeddingCfg = config.agent.embedding;
    let embeddings;
    if (embeddingCfg.provider === "openai" && embeddingCfg.apiKey) {
        embeddings = new OpenAIEmbeddingProvider({ apiKey: embeddingCfg.apiKey, model: embeddingCfg.model });
    }
    else {
        embeddings = new NoOpEmbeddingProvider();
    }
    // Memory system
    const memoryManager = new MemoryManager({
        episodic: new EpisodicMemory(new InMemoryEpisodicStore(), embeddings),
        semantic: new SemanticMemory(new InMemorySemanticStore(), embeddings),
        procedural: new ProceduralMemory(new InMemoryProceduralStore(), embeddings),
        userContext: new UserContextManager(new InMemoryUserContextStore()),
    });
    // MCP client servers (tools the agent can use)
    let mcpConfigs = [];
    if (process.env.MCP_SERVERS) {
        try {
            mcpConfigs = JSON.parse(process.env.MCP_SERVERS);
        }
        catch {
            process.stderr.write("[mcp-entrypoint] Failed to parse MCP_SERVERS\n");
        }
    }
    const mcpManager = new MCPManager({
        configs: mcpConfigs,
        serverFactory: async (cfg) => {
            if (cfg.transport === "sse" && cfg.url) {
                return new RemoteMCPServer(cfg);
            }
            throw new Error(`Unsupported transport "${cfg.transport}" for "${cfg.name}"`);
        },
    });
    // Agent core
    const agent = new StemAgent(config, mcpManager, memoryManager);
    await agent.initialize();
    // Start MCP server on stdio
    const mcpServer = new StemMCPServer({
        agent,
        memoryManager,
        mcpManager,
        persona,
    });
    await mcpServer.start();
    process.stderr.write(`[mcp-entrypoint] MCP server started (${persona?.name ?? "generic"})\n`);
    // Graceful shutdown
    const shutdown = async () => {
        await agent.shutdown();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
main().catch((err) => {
    process.stderr.write(`[mcp-entrypoint] Fatal: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=mcp-entrypoint.js.map