import type { IStemAgent, AgentResponse } from "@stem-agent/shared";
/**
 * Abstract base class for multi-agent framework adapters.
 * Each adapter translates between a specific framework's message format
 * and the STEM Agent's universal AgentMessage/AgentResponse types.
 */
export declare abstract class AbstractFrameworkAdapter {
    protected readonly agent: IStemAgent;
    /** Human-readable adapter name (e.g. "AutoGen", "CrewAI"). */
    abstract readonly name: string;
    /** Adapter version string. */
    abstract readonly version: string;
    constructor(agent: IStemAgent);
    /**
     * Receive a task from the framework, translate to AgentMessage,
     * and return a task ID for tracking.
     */
    abstract receiveTask(input: unknown): Promise<string>;
    /**
     * Get the current status/result for a task.
     */
    abstract getTaskStatus(taskId: string): Promise<AgentResponse>;
    /**
     * Stream partial responses for a task.
     */
    abstract streamResponse(taskId: string): AsyncIterable<AgentResponse>;
    /**
     * Cancel a running task. Returns true if cancelled successfully.
     */
    abstract cancelTask(taskId: string): Promise<boolean>;
}
//# sourceMappingURL=abstract-adapter.d.ts.map