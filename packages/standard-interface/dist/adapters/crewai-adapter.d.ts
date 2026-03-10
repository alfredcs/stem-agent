import type { IStemAgent, AgentResponse } from "@stem-agent/shared";
import { AbstractFrameworkAdapter } from "./abstract-adapter.js";
/**
 * Adapter for CrewAI framework (>=1.9).
 * Translates CrewAI task format to/from STEM Agent format.
 */
export declare class CrewAIAdapter extends AbstractFrameworkAdapter {
    readonly name = "CrewAI";
    readonly version = "1.9";
    private readonly tasks;
    constructor(agent: IStemAgent);
    receiveTask(input: unknown): Promise<string>;
    getTaskStatus(taskId: string): Promise<AgentResponse>;
    streamResponse(taskId: string): AsyncIterable<AgentResponse>;
    cancelTask(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=crewai-adapter.d.ts.map