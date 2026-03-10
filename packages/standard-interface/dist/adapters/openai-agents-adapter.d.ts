import type { IStemAgent, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for OpenAI Agents SDK.
 * Exposes the STEM Agent as an OpenAI-compatible tool, translating
 * tool calls to STEM Agent messages and responses back to tool results.
 */
export declare class OpenAIAgentsAdapter extends AbstractFrameworkAdapter {
    readonly name = "OpenAIAgents";
    readonly version = "1.0";
    private readonly tasks;
    constructor(agent: IStemAgent);
    receiveTask(input: unknown): Promise<string>;
    getTaskStatus(taskId: string): Promise<AgentResponse>;
    streamResponse(taskId: string): AsyncIterable<AgentResponse>;
    cancelTask(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=openai-agents-adapter.d.ts.map