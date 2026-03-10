import type { IStemAgent, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for Microsoft AutoGen framework (>=0.7).
 * Translates AutoGen messages to/from STEM Agent format.
 */
export declare class AutoGenAdapter extends AbstractFrameworkAdapter {
    readonly name = "AutoGen";
    readonly version = "0.7";
    private readonly tasks;
    constructor(agent: IStemAgent);
    receiveTask(input: unknown): Promise<string>;
    getTaskStatus(taskId: string): Promise<AgentResponse>;
    streamResponse(taskId: string): AsyncIterable<AgentResponse>;
    cancelTask(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=autogen-adapter.d.ts.map