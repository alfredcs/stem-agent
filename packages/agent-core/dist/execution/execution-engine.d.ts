import type { IMCPManager, IMemoryManager, ExecutionPlan, ExecutionResult, BehaviorParameters } from "@stem-agent/shared";
import type { AgentCoreConfig } from "../config.js";
/**
 * Execution Engine — executes plans step-by-step via MCP tools.
 *
 * Supports parallel execution of independent steps, per-step retries,
 * fallback actions, a circuit breaker pattern, and procedural memory
 * learning on success.
 */
export declare class ExecutionEngine {
    private readonly mcp;
    private readonly memory;
    private readonly maxRetries;
    private readonly parallelExecution;
    private readonly circuitBreakerThreshold;
    private readonly stepTimeoutMs;
    private readonly log;
    /** Tracks consecutive failures for circuit breaker. */
    private consecutiveFailures;
    constructor(mcp: IMCPManager, memory: IMemoryManager, config: AgentCoreConfig);
    /**
     * Execute a plan and return the aggregated result.
     *
     * @param plan - The execution plan to run.
     * @returns Validated ExecutionResult.
     */
    execute(plan: ExecutionPlan, behavior?: BehaviorParameters): Promise<ExecutionResult>;
    /** Execute a single step with retry logic. */
    private executeStepWithRetry;
    /** Execute a single plan step. */
    private executeStep;
    /** Execute the fallback action for a step. */
    private executeFallback;
    /** Wrap a promise with a timeout. */
    private withTimeout;
    /** Update circuit breaker state. */
    private updateCircuitBreaker;
    /** Store a learned procedure from a successful plan execution. */
    private learnFromSuccess;
}
//# sourceMappingURL=execution-engine.d.ts.map