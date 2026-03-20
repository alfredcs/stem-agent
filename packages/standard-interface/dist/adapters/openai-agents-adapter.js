import { v4 as uuidv4 } from "uuid";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for OpenAI Agents SDK.
 * Exposes the STEM Agent as an OpenAI-compatible tool, translating
 * tool calls to STEM Agent messages and responses back to tool results.
 */
export class OpenAIAgentsAdapter extends AbstractFrameworkAdapter {
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
        const taskId = uuidv4();
        const message = {
            id: uuidv4(),
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
            return { id: uuidv4(), status: "pending", contentType: "text/plain", artifacts: [], metadata: {} };
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
//# sourceMappingURL=openai-agents-adapter.js.map