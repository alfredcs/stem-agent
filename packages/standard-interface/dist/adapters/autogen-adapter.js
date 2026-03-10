"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoGenAdapter = void 0;
const uuid_1 = require("uuid");
const abstract_adapter_js_1 = require("./abstract-adapter.js");
/**
 * Adapter for Microsoft AutoGen framework (>=0.7).
 * Translates AutoGen messages to/from STEM Agent format.
 */
class AutoGenAdapter extends abstract_adapter_js_1.AbstractFrameworkAdapter {
    name = "AutoGen";
    version = "0.7";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const msg = input;
        const taskId = (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: msg.role ?? "user",
            content: msg.content,
            contentType: "text/plain",
            metadata: { source: "autogen", name: msg.name, ...msg.metadata },
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
exports.AutoGenAdapter = AutoGenAdapter;
//# sourceMappingURL=autogen-adapter.js.map