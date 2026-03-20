/**
 * Abstract base class for multi-agent framework adapters.
 * Each adapter translates between a specific framework's message format
 * and the STEM Agent's universal AgentMessage/AgentResponse types.
 */
export class AbstractFrameworkAdapter {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
}
//# sourceMappingURL=abstract-adapter.js.map