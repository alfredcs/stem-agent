import type { IStemAgent, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for LangGraph/LangChain framework (>=1.0).
 * Translates LangGraph state to/from STEM Agent format.
 */
export declare class LangGraphAdapter extends AbstractFrameworkAdapter {
    readonly name = "LangGraph";
    readonly version = "1.0";
    private readonly tasks;
    constructor(agent: IStemAgent);
    receiveTask(input: unknown): Promise<string>;
    getTaskStatus(taskId: string): Promise<AgentResponse>;
    streamResponse(taskId: string): AsyncIterable<AgentResponse>;
    cancelTask(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=langgraph-adapter.d.ts.map