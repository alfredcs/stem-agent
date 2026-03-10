import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";

/** OpenAI Agents SDK tool call shape (simplified). */
interface OpenAIToolCall {
  name: string;
  arguments: string; // JSON string
}

/**
 * Adapter for OpenAI Agents SDK.
 * Exposes the STEM Agent as an OpenAI-compatible tool, translating
 * tool calls to STEM Agent messages and responses back to tool results.
 */
export class OpenAIAgentsAdapter extends AbstractFrameworkAdapter {
  readonly name = "OpenAIAgents";
  readonly version = "1.0";

  private readonly tasks = new Map<string, { message: AgentMessage; response?: AgentResponse }>();

  constructor(agent: IStemAgent) {
    super(agent);
  }

  async receiveTask(input: unknown): Promise<string> {
    const toolCall = input as OpenAIToolCall;
    let content: unknown;
    try {
      content = JSON.parse(toolCall.arguments);
    } catch {
      content = toolCall.arguments;
    }

    const taskId = uuidv4();
    const message: AgentMessage = {
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
