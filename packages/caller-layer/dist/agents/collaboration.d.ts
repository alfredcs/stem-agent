import type { AgentResponse } from "@stem-agent/shared";
import type { AgentProxy } from "./agent-proxy.js";
export interface CollaborationResult {
    success: boolean;
    results: Array<{
        agentId: string;
        response: AgentResponse | null;
        error?: string;
    }>;
    metadata?: Record<string, unknown>;
}
export interface Subtask {
    id: string;
    content: string;
    requiredCapability?: string;
    metadata?: Record<string, unknown>;
}
export interface PipelineStage {
    agentProxy: AgentProxy;
    transform?: (previousOutput: string) => string;
}
export interface CollaborationPattern {
    name: string;
    execute(task: string, agents: AgentProxy[]): Promise<CollaborationResult>;
}
/**
 * Decomposes a task into subtasks, assigns each to the best-fit agent
 * by capability, and executes them in parallel.
 */
export declare class DelegationPattern implements CollaborationPattern {
    private readonly decompose;
    private readonly aggregate;
    readonly name = "delegation";
    private readonly log;
    constructor(decompose: (task: string) => Subtask[], aggregate: (results: CollaborationResult["results"]) => string);
    execute(task: string, agents: AgentProxy[]): Promise<CollaborationResult>;
}
/**
 * Sends the same task to all agents, extracts votes, and determines
 * whether consensus is reached based on a configurable threshold.
 */
export declare class ConsensusPattern implements CollaborationPattern {
    private readonly extractVote;
    readonly name = "consensus";
    private readonly log;
    private readonly threshold;
    private readonly weights;
    constructor(extractVote: (response: AgentResponse) => string, opts?: {
        threshold?: number;
        weights?: Map<string, number>;
    });
    execute(task: string, agents: AgentProxy[]): Promise<CollaborationResult>;
}
/**
 * Executes a task through a sequential pipeline of agents, where each
 * stage's output feeds into the next stage.
 */
export declare class PipelinePattern implements CollaborationPattern {
    private readonly stages;
    readonly name = "pipeline";
    private readonly log;
    constructor(stages: PipelineStage[]);
    execute(task: string, _agents: AgentProxy[]): Promise<CollaborationResult>;
}
//# sourceMappingURL=collaboration.d.ts.map