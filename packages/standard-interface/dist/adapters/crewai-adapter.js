"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrewAIAdapter = void 0;
const uuid_1 = require("uuid");
const abstract_adapter_js_1 = require("./abstract-adapter.js");
/**
 * Adapter for CrewAI framework (>=1.9).
 * Translates CrewAI task format to/from STEM Agent format.
 */
class CrewAIAdapter extends abstract_adapter_js_1.AbstractFrameworkAdapter {
    name = "CrewAI";
    version = "1.9";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const task = input;
        const taskId = (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: "user",
            content: task.description,
            contentType: "text/plain",
            metadata: {
                source: "crewai",
                expectedOutput: task.expected_output,
                agent: task.agent,
                ...task.context,
            },
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
exports.CrewAIAdapter = CrewAIAdapter;
//# sourceMappingURL=crewai-adapter.js.map