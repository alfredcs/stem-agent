import { v4 as uuidv4 } from "uuid";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for LangGraph/LangChain framework (>=1.0).
 * Translates LangGraph state to/from STEM Agent format.
 */
export class LangGraphAdapter extends AbstractFrameworkAdapter {
    name = "LangGraph";
    version = "1.0";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const state = input;
        const lastMessage = state.messages[state.messages.length - 1];
        const taskId = uuidv4();
        const message = {
            id: uuidv4(),
            role: lastMessage?.role ?? "user",
            content: lastMessage?.content ?? "",
            contentType: "text/plain",
            metadata: {
                source: "langgraph",
                messageCount: state.messages.length,
                ...state.metadata,
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
//# sourceMappingURL=langgraph-adapter.js.map