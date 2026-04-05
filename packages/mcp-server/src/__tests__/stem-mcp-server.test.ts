import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StemMCPServer } from "../stem-mcp-server.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type {
  IStemAgent,
  IMemoryManager,
  IMCPManager,
  AgentMessage,
  AgentResponse,
  AgentCard,
  DomainPersona,
  Episode,
  MCPTool,
  MCPToolResult,
  MCPServerConfig,
  MCPResource,
  CallerProfile,
} from "@stem-agent/shared";

// ---------------------------------------------------------------------------
// Shared Mocks
// ---------------------------------------------------------------------------

const MOCK_CARD: AgentCard = {
  agentId: "test-001",
  name: "Test Agent",
  description: "A test stem-agent",
  version: "0.1.0",
  endpoint: "http://localhost:8000",
  skills: [
    { id: "skill-1", name: "test_skill", description: "A test skill" },
    { id: "skill-2", name: "search_arxiv", description: "Search arxiv papers" },
  ],
  maxConcurrentTasks: 10,
  supportsStreaming: true,
  supportsPushNotifications: false,
  protocolVersion: "0.3.0",
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  securitySchemes: [],
};

const MOCK_EPISODES: Episode[] = [
  {
    id: "ep-1",
    timestamp: 1700000000000,
    actors: ["user-1"],
    actions: ["query"],
    context: { topic: "finance" },
    outcome: "completed",
    importance: 0.7,
    summary: "User asked about market trends",
  },
  {
    id: "ep-2",
    timestamp: 1700001000000,
    actors: ["user-2"],
    actions: ["analyze"],
    context: { topic: "risk" },
    outcome: "completed",
    importance: 0.5,
    summary: "Risk analysis for portfolio",
  },
];

const FINANCE_PERSONA: DomainPersona = {
  name: "FinanceAgent",
  systemPrompt: "You are a financial agent. Never give investment advice.",
  allowedIntents: ["question", "analysis_request"],
  forbiddenTopics: ["investment advice", "insider trading"],
  preferredStrategy: "reflexion",
  defaultBehavior: {
    reasoningDepth: 5,
    confidenceThreshold: 0.8,
    creativityLevel: 0.2,
  },
  requiredMCPServers: ["bloomberg-mcp"],
  toolAllowlist: ["market_data_query"],
  domainTags: ["finance", "trading"],
};

function createMockAgent(overrides?: Partial<IStemAgent>): IStemAgent {
  return {
    process: vi.fn<[string, AgentMessage], Promise<AgentResponse>>().mockResolvedValue({
      id: "resp-1",
      status: "completed",
      content: "The analysis shows a positive trend in Q3 earnings.",
      contentType: "text/plain",
      artifacts: [],
      metadata: { taskId: "task-1", strategy: "reflexion", confidence: 0.92 },
      reasoningTrace: ["Step 1: Identified intent", "Step 2: Analyzed data"],
    }),
    stream: vi.fn(),
    initialize: vi.fn<[], Promise<void>>().mockResolvedValue(),
    shutdown: vi.fn<[], Promise<void>>().mockResolvedValue(),
    getAgentCard: vi.fn<[], AgentCard>().mockReturnValue(MOCK_CARD),
    ...overrides,
  };
}

function createMockMemory(overrides?: Partial<IMemoryManager>): IMemoryManager {
  return {
    remember: vi.fn<[Episode], Promise<void>>().mockResolvedValue(),
    recall: vi.fn<[string, number], Promise<Episode[]>>().mockResolvedValue(MOCK_EPISODES),
    storeKnowledge: vi.fn().mockResolvedValue(),
    queryKnowledge: vi.fn().mockResolvedValue([]),
    storeProcedure: vi.fn().mockResolvedValue(),
    findProcedure: vi.fn().mockResolvedValue([]),
    getCallerProfile: vi.fn<[string], Promise<CallerProfile>>().mockResolvedValue({
      callerId: "test",
      philosophy: { pragmatismVsIdealism: 0.5, simplicityVsCompleteness: 0.5, depthVsBreadth: 0.5, riskTolerance: 0.5, innovationOrientation: 0.5 },
      style: { formality: 0.5, verbosity: 0.5, technicalDepth: 0.5, examplesPreference: 0.5, preferredOutputFormat: "markdown" },
      habits: { typicalSessionLength: 30, iterationTendency: 0.5, questionAsking: 0.5, contextProviding: 0.5, peakHours: [], commonTopics: [] },
      principles: { communicationStyle: "balanced", detailLevel: "standard", preferredResponseFormat: "markdown", domainExpertise: {}, interactionGoals: [] },
      confidence: 0.5, totalInteractions: 0, satisfactionScores: [], createdAt: Date.now(), updatedAt: Date.now(),
    }),
    updateCallerProfile: vi.fn().mockResolvedValue(),
    shutdown: vi.fn().mockResolvedValue(),
    ...overrides,
  };
}

function createMockMCPManager(overrides?: Partial<IMCPManager>): IMCPManager {
  return {
    connectAll: vi.fn<[], Promise<void>>().mockResolvedValue(),
    discoverCapabilities: vi.fn<[], Promise<MCPTool[]>>().mockResolvedValue([]),
    callTool: vi.fn<[string, Record<string, unknown>, string?], Promise<MCPToolResult>>().mockResolvedValue({ toolName: "test", success: true, data: {} }),
    dynamicConnect: vi.fn<[MCPServerConfig], Promise<void>>().mockResolvedValue(),
    shutdown: vi.fn<[], Promise<void>>().mockResolvedValue(),
    healthCheck: vi.fn<[], Promise<Record<string, boolean>>>().mockResolvedValue({
      "bloomberg-mcp": true,
      "risk-engine": true,
      "compliance-checker": false,
    }),
    listResources: vi.fn<[string?], Promise<MCPResource[]>>().mockResolvedValue([]),
    readResource: vi.fn<[string, string?], Promise<unknown>>().mockResolvedValue(null),
    setLogLevel: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: create an in-memory client <-> server pair
// ---------------------------------------------------------------------------

async function createClientServerPair(opts: {
  agent?: IStemAgent;
  memory?: IMemoryManager;
  mcp?: IMCPManager;
  persona?: DomainPersona;
}): Promise<{ client: Client; server: StemMCPServer; cleanup: () => Promise<void> }> {
  const agent = opts.agent ?? createMockAgent();
  const memory = opts.memory ?? createMockMemory();
  const mcpManager = opts.mcp ?? createMockMCPManager();

  const stemServer = new StemMCPServer({
    agent,
    memoryManager: memory,
    mcpManager,
    persona: opts.persona,
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "0.1.0" });

  await stemServer.getServer().connect(serverTransport);
  await client.connect(clientTransport);

  const cleanup = async () => {
    await client.close();
    await clientTransport.close();
    await serverTransport.close();
  };

  return { client, server: stemServer, cleanup };
}

// ---------------------------------------------------------------------------
// Construction Tests
// ---------------------------------------------------------------------------

describe("StemMCPServer — Construction", () => {
  it("constructs without persona", () => {
    const server = new StemMCPServer({
      agent: createMockAgent(),
      memoryManager: createMockMemory(),
      mcpManager: createMockMCPManager(),
    });
    expect(server).toBeDefined();
    expect(server.getServer()).toBeDefined();
  });

  it("constructs with finance persona", () => {
    const server = new StemMCPServer({
      agent: createMockAgent(),
      memoryManager: createMockMemory(),
      mcpManager: createMockMCPManager(),
      persona: FINANCE_PERSONA,
    });
    expect(server).toBeDefined();
  });

  it("exposes the underlying McpServer with .server property", () => {
    const server = new StemMCPServer({
      agent: createMockAgent(),
      memoryManager: createMockMemory(),
      mcpManager: createMockMCPManager(),
    });
    const inner = server.getServer();
    expect(inner).toBeDefined();
    expect(inner.server).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tool Discovery Tests — verify all 6 tools are registered
// ---------------------------------------------------------------------------

describe("StemMCPServer — Tool Discovery", () => {
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const pair = await createClientServerPair({});
    client = pair.client;
    cleanup = pair.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it("lists all 6 registered tools", async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      "stem_agent_card",
      "stem_get_persona",
      "stem_health",
      "stem_list_skills",
      "stem_process",
      "stem_recall_memory",
    ]);
  });

  it("each tool has a non-empty description", async () => {
    const result = await client.listTools();
    for (const tool of result.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description!.length).toBeGreaterThan(10);
    }
  });

  it("stem_process has message and callerId params in its schema", async () => {
    const result = await client.listTools();
    const processTool = result.tools.find((t) => t.name === "stem_process");
    expect(processTool).toBeDefined();
    const schema = processTool!.inputSchema;
    expect(schema.properties).toHaveProperty("message");
    expect(schema.properties).toHaveProperty("callerId");
    expect(schema.required).toContain("message");
  });

  it("stem_recall_memory has query and limit params", async () => {
    const result = await client.listTools();
    const recallTool = result.tools.find((t) => t.name === "stem_recall_memory");
    expect(recallTool).toBeDefined();
    const schema = recallTool!.inputSchema;
    expect(schema.properties).toHaveProperty("query");
    expect(schema.properties).toHaveProperty("limit");
  });
});

// ---------------------------------------------------------------------------
// stem_process — full pipeline invocation
// ---------------------------------------------------------------------------

describe("stem_process tool", () => {
  it("calls agent.process and returns structured response", async () => {
    const agent = createMockAgent();
    const { client, cleanup } = await createClientServerPair({ agent });

    const result = await client.callTool({ name: "stem_process", arguments: { message: "Analyze Q3 earnings" } });

    // Verify agent.process was called
    expect(agent.process).toHaveBeenCalledOnce();
    const callArgs = (agent.process as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[0]).toMatch(/^[0-9a-f-]{36}$/); // taskId is UUID
    expect(callArgs[1].content).toBe("Analyze Q3 earnings");
    expect(callArgs[1].callerId).toBe("claude-code"); // default callerId

    // Verify response shape
    expect(result.content).toHaveLength(1);
    const text = (result.content[0] as { type: string; text: string }).text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe("completed");
    expect(parsed.content).toContain("positive trend");
    expect(parsed.reasoning).toEqual(["Step 1: Identified intent", "Step 2: Analyzed data"]);
    expect(parsed.metadata.strategy).toBe("reflexion");

    await cleanup();
  });

  it("passes custom callerId to agent", async () => {
    const agent = createMockAgent();
    const { client, cleanup } = await createClientServerPair({ agent });

    await client.callTool({ name: "stem_process", arguments: { message: "test", callerId: "finance-trader-42" } });

    const callArgs = (agent.process as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1].callerId).toBe("finance-trader-42");

    await cleanup();
  });

  it("returns error status when agent fails", async () => {
    const agent = createMockAgent({
      process: vi.fn().mockResolvedValue({
        id: "resp-err",
        status: "failed",
        content: "Error: tool timeout exceeded",
        contentType: "text/plain",
        artifacts: [],
        metadata: { taskId: "task-1", error: true },
      }),
    });
    const { client, cleanup } = await createClientServerPair({ agent });

    const result = await client.callTool({ name: "stem_process", arguments: { message: "do something" } });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.status).toBe("failed");
    expect(parsed.content).toContain("timeout");

    await cleanup();
  });

  it("handles agent.process throwing an exception", async () => {
    const agent = createMockAgent({
      process: vi.fn().mockRejectedValue(new Error("LLM rate limit exceeded")),
    });
    const { client, cleanup } = await createClientServerPair({ agent });

    // The MCP SDK wraps handler errors into { isError: true } response
    const result = await client.callTool({ name: "stem_process", arguments: { message: "test" } });
    expect(result.isError).toBe(true);
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("LLM rate limit exceeded");

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// stem_list_skills — skill listing
// ---------------------------------------------------------------------------

describe("stem_list_skills tool", () => {
  it("returns agent name and skills from agent card", async () => {
    const { client, cleanup } = await createClientServerPair({});

    const result = await client.callTool({ name: "stem_list_skills", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.agentName).toBe("Test Agent");
    expect(parsed.skills).toHaveLength(2);
    expect(parsed.skills[0].name).toBe("test_skill");
    expect(parsed.skills[1].name).toBe("search_arxiv");

    await cleanup();
  });

  it("returns empty skills for agent with no tools", async () => {
    const agent = createMockAgent({
      getAgentCard: vi.fn().mockReturnValue({ ...MOCK_CARD, skills: [] }),
    });
    const { client, cleanup } = await createClientServerPair({ agent });

    const result = await client.callTool({ name: "stem_list_skills", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.skills).toEqual([]);

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// stem_agent_card — capability card
// ---------------------------------------------------------------------------

describe("stem_agent_card tool", () => {
  it("returns full agent card without persona", async () => {
    const { client, cleanup } = await createClientServerPair({});

    const result = await client.callTool({ name: "stem_agent_card", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.agentId).toBe("test-001");
    expect(parsed.name).toBe("Test Agent");
    expect(parsed.version).toBe("0.1.0");
    expect(parsed.skills).toHaveLength(2);
    expect(parsed.persona).toBeUndefined();

    await cleanup();
  });

  it("includes persona summary when persona is set", async () => {
    const { client, cleanup } = await createClientServerPair({ persona: FINANCE_PERSONA });

    const result = await client.callTool({ name: "stem_agent_card", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.persona).toBeDefined();
    expect(parsed.persona.name).toBe("FinanceAgent");
    expect(parsed.persona.preferredStrategy).toBe("reflexion");
    expect(parsed.persona.allowedIntents).toEqual(["question", "analysis_request"]);
    expect(parsed.persona.domainTags).toEqual(["finance", "trading"]);

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// stem_recall_memory — memory query
// ---------------------------------------------------------------------------

describe("stem_recall_memory tool", () => {
  it("calls memory.recall with query and limit", async () => {
    const memory = createMockMemory();
    const { client, cleanup } = await createClientServerPair({ memory });

    await client.callTool({ name: "stem_recall_memory", arguments: { query: "market trends", limit: 5 } });

    expect(memory.recall).toHaveBeenCalledWith("market trends", 5);

    await cleanup();
  });

  it("uses default limit of 10 when not specified", async () => {
    const memory = createMockMemory();
    const { client, cleanup } = await createClientServerPair({ memory });

    await client.callTool({ name: "stem_recall_memory", arguments: { query: "risk analysis" } });

    expect(memory.recall).toHaveBeenCalledWith("risk analysis", 10);

    await cleanup();
  });

  it("returns correctly shaped episode data", async () => {
    const { client, cleanup } = await createClientServerPair({});

    const result = await client.callTool({ name: "stem_recall_memory", arguments: { query: "test" } });
    const episodes = JSON.parse((result.content[0] as { text: string }).text);

    expect(episodes).toHaveLength(2);
    expect(episodes[0]).toEqual({
      id: "ep-1",
      summary: "User asked about market trends",
      actors: ["user-1"],
      actions: ["query"],
      outcome: "completed",
      importance: 0.7,
      timestamp: 1700000000000,
    });
    expect(episodes[1].id).toBe("ep-2");
    expect(episodes[1].summary).toBe("Risk analysis for portfolio");

    await cleanup();
  });

  it("returns empty array when no memories found", async () => {
    const memory = createMockMemory({
      recall: vi.fn().mockResolvedValue([]),
    });
    const { client, cleanup } = await createClientServerPair({ memory });

    const result = await client.callTool({ name: "stem_recall_memory", arguments: { query: "nonexistent" } });
    const episodes = JSON.parse((result.content[0] as { text: string }).text);
    expect(episodes).toEqual([]);

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// stem_health — health check
// ---------------------------------------------------------------------------

describe("stem_health tool", () => {
  it("returns agent info and MCP server health", async () => {
    const { client, cleanup } = await createClientServerPair({});

    const result = await client.callTool({ name: "stem_health", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.agent).toEqual({
      name: "Test Agent",
      version: "0.1.0",
      status: "running",
      toolCount: 2,
    });
    expect(parsed.mcpServers).toEqual({
      "bloomberg-mcp": true,
      "risk-engine": true,
      "compliance-checker": false,
    });
    expect(parsed.persona).toBe("generic");

    await cleanup();
  });

  it("shows persona name when set", async () => {
    const { client, cleanup } = await createClientServerPair({ persona: FINANCE_PERSONA });

    const result = await client.callTool({ name: "stem_health", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.persona).toBe("FinanceAgent");

    await cleanup();
  });

  it("reports when all MCP servers are down", async () => {
    const mcpManager = createMockMCPManager({
      healthCheck: vi.fn().mockResolvedValue({
        "bloomberg-mcp": false,
        "risk-engine": false,
      }),
    });
    const { client, cleanup } = await createClientServerPair({ mcp: mcpManager });

    const result = await client.callTool({ name: "stem_health", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(Object.values(parsed.mcpServers).every((v) => v === false)).toBe(true);

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// stem_get_persona — persona introspection
// ---------------------------------------------------------------------------

describe("stem_get_persona tool", () => {
  it("returns 'no persona' message for generic agent", async () => {
    const { client, cleanup } = await createClientServerPair({});

    const result = await client.callTool({ name: "stem_get_persona", arguments: {} });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("No domain persona configured");
    expect(text).toContain("generic stem-agent");

    await cleanup();
  });

  it("returns full persona when set", async () => {
    const { client, cleanup } = await createClientServerPair({ persona: FINANCE_PERSONA });

    const result = await client.callTool({ name: "stem_get_persona", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.name).toBe("FinanceAgent");
    expect(parsed.systemPrompt).toContain("financial agent");
    expect(parsed.forbiddenTopics).toContain("investment advice");
    expect(parsed.preferredStrategy).toBe("reflexion");
    expect(parsed.defaultBehavior.reasoningDepth).toBe(5);
    expect(parsed.requiredMCPServers).toEqual(["bloomberg-mcp"]);
    expect(parsed.domainTags).toContain("finance");

    await cleanup();
  });

  it("returns SRE persona correctly", async () => {
    const srePerson: DomainPersona = {
      name: "SREAgent",
      systemPrompt: "You are an SRE agent.",
      allowedIntents: ["command", "debugging"],
      forbiddenTopics: [],
      preferredStrategy: "react",
      defaultBehavior: { reasoningDepth: 3, toolUsePreference: 0.9 },
      requiredMCPServers: ["datadog-mcp", "kubernetes-mcp"],
      toolAllowlist: ["get_metrics", "restart_service"],
      domainTags: ["sre", "infrastructure"],
    };
    const { client, cleanup } = await createClientServerPair({ persona: srePerson });

    const result = await client.callTool({ name: "stem_get_persona", arguments: {} });
    const parsed = JSON.parse((result.content[0] as { text: string }).text);

    expect(parsed.name).toBe("SREAgent");
    expect(parsed.preferredStrategy).toBe("react");
    expect(parsed.defaultBehavior.toolUsePreference).toBe(0.9);
    expect(parsed.requiredMCPServers).toContain("kubernetes-mcp");

    await cleanup();
  });
});

// ---------------------------------------------------------------------------
// Cross-tool integration scenarios
// ---------------------------------------------------------------------------

describe("StemMCPServer — Integration Scenarios", () => {
  it("full workflow: check health -> list skills -> process message -> recall memory", async () => {
    const agent = createMockAgent();
    const memory = createMockMemory();
    const { client, cleanup } = await createClientServerPair({ agent, memory, persona: FINANCE_PERSONA });

    // Step 1: Health check
    const health = await client.callTool({ name: "stem_health", arguments: {} });
    const healthData = JSON.parse((health.content[0] as { text: string }).text);
    expect(healthData.agent.status).toBe("running");
    expect(healthData.persona).toBe("FinanceAgent");

    // Step 2: List skills
    const skills = await client.callTool({ name: "stem_list_skills", arguments: {} });
    const skillData = JSON.parse((skills.content[0] as { text: string }).text);
    expect(skillData.skills.length).toBeGreaterThan(0);

    // Step 3: Process a message
    const response = await client.callTool({ name: "stem_process", arguments: { message: "Analyze portfolio risk" } });
    const respData = JSON.parse((response.content[0] as { text: string }).text);
    expect(respData.status).toBe("completed");
    expect(agent.process).toHaveBeenCalledOnce();

    // Step 4: Recall memory
    const memories = await client.callTool({ name: "stem_recall_memory", arguments: { query: "portfolio" } });
    const memData = JSON.parse((memories.content[0] as { text: string }).text);
    expect(memory.recall).toHaveBeenCalledWith("portfolio", 10);
    expect(memData).toHaveLength(2);

    await cleanup();
  });

  it("multiple concurrent tool calls work correctly", async () => {
    const { client, cleanup } = await createClientServerPair({ persona: FINANCE_PERSONA });

    // Fire all tools concurrently
    const [health, card, persona, skills] = await Promise.all([
      client.callTool({ name: "stem_health", arguments: {} }),
      client.callTool({ name: "stem_agent_card", arguments: {} }),
      client.callTool({ name: "stem_get_persona", arguments: {} }),
      client.callTool({ name: "stem_list_skills", arguments: {} }),
    ]);

    // All should succeed with valid JSON
    expect(() => JSON.parse((health.content[0] as { text: string }).text)).not.toThrow();
    expect(() => JSON.parse((card.content[0] as { text: string }).text)).not.toThrow();
    expect(() => JSON.parse((persona.content[0] as { text: string }).text)).not.toThrow();
    expect(() => JSON.parse((skills.content[0] as { text: string }).text)).not.toThrow();

    await cleanup();
  });
});
