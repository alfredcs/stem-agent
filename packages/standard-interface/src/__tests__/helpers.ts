import type { IStemAgent, AgentMessage, AgentResponse, AgentCard } from "@stem-agent/shared";
import type { Principal } from "@stem-agent/shared";

/** Default mock agent card. */
export const MOCK_AGENT_CARD: AgentCard = {
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
export const MOCK_RESPONSE: AgentResponse = {
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
export function createMockAgent(overrides?: {
  processResult?: AgentResponse;
  streamChunks?: AgentResponse[];
  card?: AgentCard;
}): IStemAgent {
  const processResult = overrides?.processResult ?? MOCK_RESPONSE;
  const streamChunks = overrides?.streamChunks ?? [MOCK_RESPONSE];
  const card = overrides?.card ?? MOCK_AGENT_CARD;

  return {
    process: async (
      _taskId: string,
      _message: AgentMessage,
      _principal?: Principal | null,
    ): Promise<AgentResponse> => {
      return processResult;
    },

    stream: async function* (
      _taskId: string,
      _message: AgentMessage,
    ): AsyncIterable<AgentResponse> {
      for (const chunk of streamChunks) {
        yield chunk;
      }
    },

    initialize: async (): Promise<void> => {},
    shutdown: async (): Promise<void> => {},
    getAgentCard: () => card,
  };
}
