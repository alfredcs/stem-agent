import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";

/** AutoGen message shape (simplified). */
interface AutoGenMessage {
  content: string;
  role?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter for Microsoft AutoGen framework (>=0.7).
 * Translates AutoGen messages to/from STEM Agent format.
 */
export class AutoGenAdapter extends AbstractFrameworkAdapter {
  readonly name = "AutoGen";
  readonly version = "0.7";

  private readonly tasks = new Map<string, { message: AgentMessage; response?: AgentResponse }>();

  constructor(agent: IStemAgent) {
    super(agent);
  }

  async receiveTask(input: unknown): Promise<string> {
    const msg = input as AutoGenMessage;
    const taskId = uuidv4();
    const message: AgentMessage = {
      id: uuidv4(),
      role: (msg.role as AgentMessage["role"]) ?? "user",
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
