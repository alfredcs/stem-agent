import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";

/** LangGraph state shape (simplified). */
interface LangGraphState {
  messages: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
}

/**
 * Adapter for LangGraph/LangChain framework (>=1.0).
 * Translates LangGraph state to/from STEM Agent format.
 */
export class LangGraphAdapter extends AbstractFrameworkAdapter {
  readonly name = "LangGraph";
  readonly version = "1.0";

  private readonly tasks = new Map<string, { message: AgentMessage; response?: AgentResponse }>();

  constructor(agent: IStemAgent) {
    super(agent);
  }

  async receiveTask(input: unknown): Promise<string> {
    const state = input as LangGraphState;
    const lastMessage = state.messages[state.messages.length - 1];
    const taskId = uuidv4();
    const message: AgentMessage = {
      id: uuidv4(),
      role: (lastMessage?.role as AgentMessage["role"]) ?? "user",
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
