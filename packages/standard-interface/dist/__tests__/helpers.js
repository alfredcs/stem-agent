"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_RESPONSE = exports.MOCK_AGENT_CARD = void 0;
exports.createMockAgent = createMockAgent;
/** Default mock agent card. */
exports.MOCK_AGENT_CARD = {
    agentId: "test-agent",
    name: "Test Agent",
    description: "A test agent",
    version: "1.0.0",
    protocolVersion: "0.3.0",
    supportedProtocols: ["a2a/0.3.0", "openapi/3.1"],
    skills: [
        {
            id: "test-skill",
            name: "Test",
            description: "Testing",
            tags: ["test"],
            examples: ["example"],
        },
    ],
    endpoint: "http://localhost:8000",
    maxConcurrentTasks: 10,
    supportsStreaming: true,
    supportsPushNotifications: true,
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    securitySchemes: [],
    securityRequirements: [],
};
/** Default mock response. */
exports.MOCK_RESPONSE = {
    id: "resp-1",
    status: "completed",
    content: "Hello from the agent",
    contentType: "text/plain",
    artifacts: [],
    metadata: {},
};
/**
 * Create a mock IStemAgent for testing.
 */
function createMockAgent(overrides) {
    const processResult = overrides?.processResult ?? exports.MOCK_RESPONSE;
    const streamChunks = overrides?.streamChunks ?? [exports.MOCK_RESPONSE];
    const card = overrides?.card ?? exports.MOCK_AGENT_CARD;
    return {
        process: async (_taskId, _message, _principal) => {
            return processResult;
        },
        stream: async function* (_taskId, _message) {
            for (const chunk of streamChunks) {
                yield chunk;
            }
        },
        initialize: async () => { },
        shutdown: async () => { },
        getAgentCard: () => card,
    };
}
//# sourceMappingURL=helpers.js.map