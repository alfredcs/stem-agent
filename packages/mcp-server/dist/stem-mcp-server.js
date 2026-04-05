import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentMessageSchema } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";
export class StemMCPServer {
    mcp;
    agent;
    memory;
    mcpManager;
    persona;
    constructor(opts) {
        this.agent = opts.agent;
        this.memory = opts.memoryManager;
        this.mcpManager = opts.mcpManager;
        this.persona = opts.persona;
        const agentName = opts.persona?.name ?? "stem-agent";
        this.mcp = new McpServer({ name: agentName, version: "0.1.0" }, { capabilities: { tools: {} } });
        this.registerTools();
    }
    /** Start the MCP server on stdio transport. */
    async start() {
        const transport = new StdioServerTransport();
        await this.mcp.connect(transport);
    }
    /** Get the underlying McpServer for custom transport (e.g., SSE). */
    getServer() {
        return this.mcp;
    }
    registerTools() {
        // -- stem_process: send a message through the full pipeline -----------
        this.mcp.tool("stem_process", "Send a message through the stem-agent pipeline (Perceive -> Reason -> Plan -> Execute). Returns the agent response.", {
            message: z.string().describe("The message to send to the agent"),
            callerId: z.string().optional().describe("Caller ID for profile-based adaptation"),
        }, async ({ message, callerId }) => {
            const taskId = randomUUID();
            const agentMessage = AgentMessageSchema.parse({
                id: randomUUID(),
                role: "user",
                content: message,
                contentType: "text/plain",
                callerId: callerId ?? "claude-code",
            });
            const response = await this.agent.process(taskId, agentMessage);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            status: response.status,
                            content: response.content,
                            reasoning: response.reasoningTrace,
                            metadata: response.metadata,
                        }, null, 2),
                    },
                ],
            };
        });
        // -- stem_list_skills: list all registered skills --------------------
        this.mcp.tool("stem_list_skills", "List all skills registered in the stem-agent (both crystallized and plugin). Shows maturity, success rate, and triggers.", {}, async () => {
            const card = this.agent.getAgentCard();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            agentName: card.name,
                            skills: card.skills,
                        }, null, 2),
                    },
                ],
            };
        });
        // -- stem_agent_card: get the agent capability card ------------------
        this.mcp.tool("stem_agent_card", "Get the agent card describing this stem-agent's identity, capabilities, and available skills.", {}, async () => {
            const card = this.agent.getAgentCard();
            const persona = this.persona;
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            ...card,
                            persona: persona ? {
                                name: persona.name,
                                preferredStrategy: persona.preferredStrategy,
                                allowedIntents: persona.allowedIntents,
                                domainTags: persona.domainTags,
                            } : undefined,
                        }, null, 2),
                    },
                ],
            };
        });
        // -- stem_recall_memory: query the agent's memory --------------------
        this.mcp.tool("stem_recall_memory", "Query the stem-agent's episodic memory. Returns relevant past interactions ranked by similarity.", {
            query: z.string().describe("Search query for memory recall"),
            limit: z.number().int().min(1).max(50).default(10).describe("Max results to return"),
        }, async ({ query, limit }) => {
            const episodes = await this.memory.recall(query, limit);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(episodes.map((e) => ({
                            id: e.id,
                            summary: e.summary,
                            actors: e.actors,
                            actions: e.actions,
                            outcome: e.outcome,
                            importance: e.importance,
                            timestamp: e.timestamp,
                        })), null, 2),
                    },
                ],
            };
        });
        // -- stem_health: check agent health --------------------------------
        this.mcp.tool("stem_health", "Check the health of the stem-agent and all connected MCP servers.", {}, async () => {
            const serverHealth = await this.mcpManager.healthCheck();
            const card = this.agent.getAgentCard();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            agent: {
                                name: card.name,
                                version: card.version,
                                status: "running",
                                toolCount: card.skills.length,
                            },
                            mcpServers: serverHealth,
                            persona: this.persona?.name ?? "generic",
                        }, null, 2),
                    },
                ],
            };
        });
        // -- stem_get_persona: get the active domain persona -----------------
        this.mcp.tool("stem_get_persona", "Get the active domain persona configuration for this stem-agent instance.", {}, async () => {
            if (!this.persona) {
                return {
                    content: [{ type: "text", text: "No domain persona configured. This is a generic stem-agent." }],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(this.persona, null, 2),
                    },
                ],
            };
        });
    }
}
//# sourceMappingURL=stem-mcp-server.js.map