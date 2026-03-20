import { v4 as uuidv4 } from "uuid";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for Microsoft AutoGen framework (>=0.7).
 * Translates AutoGen messages to/from STEM Agent format.
 */
export class AutoGenAdapter extends AbstractFrameworkAdapter {
    name = "AutoGen";
    version = "0.7";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const msg = input;
        const taskId = uuidv4();
        const message = {
            id: uuidv4(),
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
//# sourceMappingURL=autogen-adapter.js.map