/**
 * STEM Agent — Server entrypoint.
 *
 * Wires together all layers and starts the HTTP gateway.
 * Environment variables are loaded via `node --env-file=.env`.
 */
import { AgentCoreConfigSchema, StemAgent } from "@stem-agent/agent-core";
import { MCPManager, RemoteMCPServer } from "@stem-agent/mcp-integration";
import { MemoryManager, EpisodicMemory, SemanticMemory, ProceduralMemory, UserContextManager, InMemoryEpisodicStore, InMemorySemanticStore, InMemoryProceduralStore, InMemoryUserContextStore, NoOpEmbeddingProvider, OpenAIEmbeddingProvider, } from "@stem-agent/memory-system";
import { Gateway } from "@stem-agent/standard-interface";
import { createLogger } from "@stem-agent/shared";
import { loadPersona, registerPersonaDomainSkills } from "./persona-loader.js";
const log = createLogger("server");
async function main() {
    // Parse configuration from environment
    const config = AgentCoreConfigSchema.parse({});
    const embeddingCfg = config.agent.embedding;
    // Load optional DomainPersona — the "transcription-factor" that
    // differentiates the agent into a specialized role.
    let persona;
    if (process.env.DOMAIN_PERSONA) {
        try {
            persona = loadPersona(process.env.DOMAIN_PERSONA);
            log.info({ persona: persona.name }, "Loaded domain persona");
        }
        catch (err) {
            log.warn({ err, path: process.env.DOMAIN_PERSONA }, "Failed to load DOMAIN_PERSONA; running undifferentiated");
        }
    }
    // Embedding provider
    let embeddings;
    if (embeddingCfg.provider === "openai" && embeddingCfg.apiKey) {
        embeddings = new OpenAIEmbeddingProvider({ apiKey: embeddingCfg.apiKey, model: embeddingCfg.model });
    }
    else {
        log.info("Using no-op embedding provider (set EMBEDDING_PROVIDER=openai + OPENAI_API_KEY for real embeddings)");
        embeddings = new NoOpEmbeddingProvider();
    }
    // Memory system (in-memory stores for now; swap to Pg* stores for production)
    const memoryManager = new MemoryManager({
        episodic: new EpisodicMemory(new InMemoryEpisodicStore(), embeddings),
        semantic: new SemanticMemory(new InMemorySemanticStore(), embeddings),
        procedural: new ProceduralMemory(new InMemoryProceduralStore(), embeddings),
        userContext: new UserContextManager(new InMemoryUserContextStore()),
    });
    // Parse MCP server configs from MCP_SERVERS env (JSON array)
    // Format: [{"name":"arxiv","transport":"sse","url":"http://..."}]
    let mcpConfigs = [];
    if (process.env.MCP_SERVERS) {
        try {
            mcpConfigs = JSON.parse(process.env.MCP_SERVERS);
            log.info({ count: mcpConfigs.length }, "Loaded MCP server configs from MCP_SERVERS");
        }
        catch (err) {
            log.warn({ err }, "Failed to parse MCP_SERVERS env var");
        }
    }
    // MCP manager with remote server factory
    const mcpManager = new MCPManager({
        configs: mcpConfigs,
        serverFactory: async (cfg) => {
            if (cfg.transport === "sse" && cfg.url) {
                return new RemoteMCPServer(cfg);
            }
            throw new Error(`Unsupported MCP transport "${cfg.transport}" for server "${cfg.name}"`);
        },
    });
    // Agent core (differentiated if persona was loaded)
    const agent = new StemAgent(config, mcpManager, memoryManager, persona);
    await agent.initialize();
    if (persona) {
        const registered = await registerPersonaDomainSkills(persona, agent.getSkillManager());
        log.info({ persona: persona.name, domains: registered }, "Domain skills registered");
    }
    log.info("Agent initialized");
    // Gateway
    const gateway = new Gateway(agent, {
        host: config.agent.server.host,
        port: config.agent.server.port,
        mcpManager,
        memoryManager,
    });
    await gateway.start();
    log.info({ host: config.agent.server.host, port: config.agent.server.port }, "STEM Agent is running");
    // Graceful shutdown
    const shutdown = async () => {
        log.info("Shutting down...");
        await gateway.stop();
        await agent.shutdown();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}
main().catch((err) => {
    log.error({ err }, "Failed to start server");
    process.exit(1);
});
//# sourceMappingURL=server.js.map