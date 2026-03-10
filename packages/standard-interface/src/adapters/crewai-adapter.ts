import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";

/** CrewAI task shape (simplified). */
interface CrewAITask {
  description: string;
  expected_output?: string;
  agent?: string;
  context?: Record<string, unknown>;
}

/**
 * Adapter for CrewAI framework (>=1.9).
 * Translates CrewAI task format to/from STEM Agent format.
 */
export class CrewAIAdapter extends AbstractFrameworkAdapter {
  readonly name = "CrewAI";
  readonly version = "1.9";

  private readonly tasks = new Map<string, { message: AgentMessage; response?: AgentResponse }>();

  constructor(agent: IStemAgent) {
    super(agent);
  }

  async receiveTask(input: unknown): Promise<string> {
    const task = input as CrewAITask;
    const taskId = uuidv4();
    const message: AgentMessage = {
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

  async getTaskStatus(taskId: string): Promise<AgentResponse> {
    const record = this.tasks.get(taskId);
    if (!record?.response) {
      return { id: uuidv4(), status: "pending", contentType: "text/plain", artifacts: [], metadata: {} };
    }
    return record.response;
  }

  async *streamResponse(taskId: string): AsyncIterable<AgentResponse> {
    const record = this.tasks.get(taskId);
    if (!record) return;

    for await (const chunk of this.agent.stream(taskId, record.message)) {
      yield chunk;
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    return this.tasks.delete(taskId);
  }
}
