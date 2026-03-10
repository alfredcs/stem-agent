import type { IStemAgent, AgentResponse, AgentCard } from "@stem-agent/shared";
/** Default mock agent card. */
export declare const MOCK_AGENT_CARD: AgentCard;
/** Default mock response. */
export declare const MOCK_RESPONSE: AgentResponse;
/**
 * Create a mock IStemAgent for testing.
 */
export declare function createMockAgent(overrides?: {
    processResult?: AgentResponse;
    streamChunks?: AgentResponse[];
    card?: AgentCard;
}): IStemAgent;
//# sourceMappingURL=helpers.d.ts.map