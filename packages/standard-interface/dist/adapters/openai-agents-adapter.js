"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAgentsAdapter = void 0;
const uuid_1 = require("uuid");
const abstract_adapter_js_1 = require("./abstract-adapter.js");
/**
 * Adapter for OpenAI Agents SDK.
 * Exposes the STEM Agent as an OpenAI-compatible tool, translating
 * tool calls to STEM Agent messages and responses back to tool results.
 */
class OpenAIAgentsAdapter extends abstract_adapter_js_1.AbstractFrameworkAdapter {
    name = "OpenAIAgents";
    version = "1.0";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const toolCall = input;
        let content;
        try {
            content = JSON.parse(toolCall.arguments);
        }
        catch {
            content = toolCall.arguments;
        }
        const taskId = (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: "tool",
            content,
            contentType: "application/json",
            metadata: { source: "openai-agents", toolName: toolCall.name },
            timestamp: Date.now(),
        };
        this.tasks.set(taskId, { message });
        const response = await this.agent.process(taskId, message);
        this.tasks.set(taskId, { message, response });
        return taskId;
    }
    async getTaskStatus(taskId) {
        const record = this.tasks.get(taskId);
        if (!record?.response) {
            return { id: (0, uuid_1.v4)(), status: "pending", contentType: "text/plain", artifacts: [], metadata: {} };
        }
        return record.response;
    }
    async *streamResponse(taskId) {
        const record = this.tasks.get(taskId);
        if (!record)
            return;
        for await (const chunk of this.agent.stream(taskId, record.message)) {
            yield chunk;
        }
    }
    async cancelTask(taskId) {
        return this.tasks.delete(taskId);
    }
}
exports.OpenAIAgentsAdapter = OpenAIAgentsAdapter;
//# sourceMappingURL=openai-agents-adapter.js.map