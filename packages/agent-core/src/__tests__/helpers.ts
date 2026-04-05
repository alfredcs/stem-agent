import type { IMCPManager, IMemoryManager, MCPTool, MCPToolResult, MCPServerConfig, Episode, Procedure, CallerContext, CallerProfile, KnowledgeTriple, AgentMessage } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

/** Creates a mock IMCPManager with sensible defaults. */
export function createMockMCP(overrides: Partial<IMCPManager> = {}): IMCPManager {
  return {
    connectAll: async () => {},
    discoverCapabilities: async (): Promise<MCPTool[]> => [
      { name: "search", description: "Search the web", parameters: [], serverName: "web" },
      { name: "calculator", description: "Do math", parameters: [], serverName: "math" },
    ],
    callTool: async (toolName: string, _args: Record<string, unknown>): Promise<MCPToolResult> => ({
      toolName,
      success: true,
      data: { result: `mock result for ${toolName}` },
    }),
    dynamicConnect: async (_config: MCPServerConfig) => {},
    shutdown: async () => {},
    healthCheck: async () => ({ web: true, math: true }),
    listResources: async () => [],
    readResource: async () => { throw new Error("Not supported"); },
    setLogLevel: () => {},
    ...overrides,
  };
}

/** Creates a mock IMemoryManager with sensible defaults. */
export function createMockMemory(overrides: Partial<IMemoryManager> = {}): IMemoryManager {
  return {
    remember: async (_episode: Episode) => {},
    recall: async (_query: string, _limit?: number): Promise<Episode[]> => [],
    learn: async (_procedure: Procedure) => {},
    getContext: async (callerId: string, sessionId: string): Promise<CallerContext> => ({
      callerId,
      sessionId,
      currentGoals: [],
      activeTasks: [],
      permissions: [],
      role: "user",
    }),
    forget: async (_callerId: string) => {},
    storeKnowledge: async (_triple: KnowledgeTriple) => {},
    searchKnowledge: async (_query: string, _limit?: number): Promise<KnowledgeTriple[]> => [],
    getCallerProfile: async (callerId: string): Promise<CallerProfile> => ({
      callerId,
      philosophy: {
        pragmatismVsIdealism: 0.5,
        simplicityVsCompleteness: 0.5,
        depthVsBreadth: 0.5,
        riskTolerance: 0.5,
        innovationOrientation: 0.5,
      },
      style: {
        formality: 0.5,
        verbosity: 0.5,
        technicalDepth: 0.5,
        examplesPreference: 0.5,
        preferredOutputFormat: "markdown",
      },
      habits: {
        typicalSessionLength: 30,
        iterationTendency: 0.5,
        questionAsking: 0.5,
        contextProviding: 0.5,
        peakHours: [],
        commonTopics: [],
      },
      principles: {
        communicationStyle: "balanced",
        detailLevel: "standard" as const,
        preferredResponseFormat: "markdown",
        domainExpertise: {},
        interactionGoals: [],
      },
      confidence: 0,
      totalInteractions: 0,
      satisfactionScores: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    updateCallerProfile: async (_callerId: string, _interaction: Record<string, unknown>) => {},
    getBestProcedure: async (_taskDescription: string): Promise<Procedure | null> => null,
    updateEpisodeUtility: async (_id: string, _reward: number) => {},
    updateKnowledgeUtility: async (_id: string, _reward: number) => {},
    shutdown: async () => {},
    ...overrides,
  };
}

/** Creates a simple AgentMessage for testing. */
export function createMessage(content: string, overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: randomUUID(),
    role: "user",
    content,
    contentType: "text/plain",
    metadata: {},
    timestamp: Date.now(),
    ...overrides,
  };
}
