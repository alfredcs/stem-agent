import { v4 as uuidv4 } from "uuid";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for CrewAI framework (>=1.9).
 * Translates CrewAI task format to/from STEM Agent format.
 */
export class CrewAIAdapter extends AbstractFrameworkAdapter {
    name = "CrewAI";
    version = "1.9";
    tasks = new Map();
    constructor(agent) {
        super(agent);
    }
    async receiveTask(input) {
        const task = input;
        const taskId = uuidv4();
        const message = {
            id: uuidv4(),
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
//# sourceMappingURL=crewai-adapter.js.map