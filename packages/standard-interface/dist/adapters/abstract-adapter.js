"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractFrameworkAdapter = void 0;
/**
 * Abstract base class for multi-agent framework adapters.
 * Each adapter translates between a specific framework's message format
 * and the STEM Agent's universal AgentMessage/AgentResponse types.
 */
class AbstractFrameworkAdapter {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
}
exports.AbstractFrameworkAdapter = AbstractFrameworkAdapter;
//# sourceMappingURL=abstract-adapter.js.map