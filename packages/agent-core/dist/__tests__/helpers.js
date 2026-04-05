import { randomUUID } from "node:crypto";
/** Creates a mock IMCPManager with sensible defaults. */
export function createMockMCP(overrides = {}) {
    return {
        connectAll: async () => { },
        discoverCapabilities: async () => [
            { name: "search", description: "Search the web", parameters: [], serverName: "web" },
            { name: "calculator", description: "Do math", parameters: [], serverName: "math" },
        ],
        callTool: async (toolName, _args) => ({
            toolName,
            success: true,
            data: { result: `mock result for ${toolName}` },
        }),
        dynamicConnect: async (_config) => { },
        shutdown: async () => { },
        healthCheck: async () => ({ web: true, math: true }),
        listResources: async () => [],
        readResource: async () => { throw new Error("Not supported"); },
        setLogLevel: () => { },
        ...overrides,
    };
}
/** Creates a mock IMemoryManager with sensible defaults. */
export function createMockMemory(overrides = {}) {
    return {
        remember: async (_episode) => { },
        recall: async (_query, _limit) => [],
        learn: async (_procedure) => { },
        getContext: async (callerId, sessionId) => ({
            callerId,
            sessionId,
            currentGoals: [],
            activeTasks: [],
            permissions: [],
            role: "user",
        }),
        forget: async (_callerId) => { },
        storeKnowledge: async (_triple) => { },
        searchKnowledge: async (_query, _limit) => [],
        getCallerProfile: async (callerId) => ({
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
                detailLevel: "standard",
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
        updateCallerProfile: async (_callerId, _interaction) => { },
        getBestProcedure: async (_taskDescription) => null,
        updateEpisodeUtility: async (_id, _reward) => { },
        updateKnowledgeUtility: async (_id, _reward) => { },
        shutdown: async () => { },
        ...overrides,
    };
}
/** Creates a simple AgentMessage for testing. */
export function createMessage(content, overrides = {}) {
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
//# sourceMappingURL=helpers.js.map