import type { IMemoryManager, ReasoningResult, MCPTool, ExecutionPlan, PlanStep, BehaviorParameters } from "@stem-agent/shared";
import type { AgentCoreConfig } from "../config.js";
import type { ILLMClient } from "../llm/index.js";
/**
 * Planning Engine — converts reasoning results into executable plans.
 *
 * Queries procedural memory for known strategies, generates plan steps
 * from reasoning, computes parallel execution groups from the dependency
 * graph, and supports adaptive re-planning on step failure.
 */
export declare class PlanningEngine {
    private readonly memory;
    private readonly maxPlanSteps;
    private readonly log;
    private readonly llmClient?;
    private readonly systemPromptPrefix?;
    constructor(memory: IMemoryManager, config: AgentCoreConfig, llmClient?: ILLMClient, systemPromptPrefix?: string);
    /**
     * Create an execution plan from a reasoning result.
     *
     * @param reasoning - The reasoning result to plan for.
     * @param availableTools - MCP tools currently available.
     * @returns Validated ExecutionPlan.
     */
    createPlan(reasoning: ReasoningResult, availableTools: MCPTool[], behavior?: BehaviorParameters): Promise<ExecutionPlan>;
    /**
     * Re-plan after a step failure: remove failed step, insert fallback,
     * recompute parallel groups.
     *
     * @param plan - Original plan.
     * @param failedStepId - The step that failed.
     * @param error - Error message from the failure.
     * @returns A new plan with the failed step replaced or removed.
     */
    replan(plan: ExecutionPlan, failedStepId: number, error: string): Promise<ExecutionPlan>;
    /** Use LLM to generate plan steps. Returns null on failure. */
    private llmGenerateSteps;
    /** Try to retrieve a matching procedure from procedural memory. */
    private tryProceduralMemory;
    /** Convert a known procedure into a plan. */
    private planFromProcedure;
    /** Generate plan steps from reasoning result. */
    private generateSteps;
    /**
     * Compute parallel execution groups from the dependency graph.
     * Steps whose dependencies are all satisfied by earlier groups
     * can run in parallel within the same group.
     */
    computeParallelGroups(steps: PlanStep[]): number[][];
    /** Estimate cost in USD based on step types. */
    private estimateCost;
}
//# sourceMappingURL=planning-engine.d.ts.map