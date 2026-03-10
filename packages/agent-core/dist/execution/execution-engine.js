"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEngine = void 0;
const shared_1 = require("@stem-agent/shared");
const shared_2 = require("@stem-agent/shared");
const node_crypto_1 = require("node:crypto");
/**
 * Execution Engine — executes plans step-by-step via MCP tools.
 *
 * Supports parallel execution of independent steps, per-step retries,
 * fallback actions, a circuit breaker pattern, and procedural memory
 * learning on success.
 */
class ExecutionEngine {
    mcp;
    memory;
    maxRetries;
    parallelExecution;
    circuitBreakerThreshold;
    stepTimeoutMs;
    log;
    /** Tracks consecutive failures for circuit breaker. */
    consecutiveFailures = 0;
    constructor(mcp, memory, config) {
        this.mcp = mcp;
        this.memory = memory;
        this.maxRetries = config.maxExecutionRetries;
        this.parallelExecution = config.parallelExecution;
        this.circuitBreakerThreshold = config.circuitBreakerThreshold;
        this.stepTimeoutMs = config.stepTimeoutMs;
        this.log = (0, shared_2.createLogger)("execution-engine");
    }
    /**
     * Execute a plan and return the aggregated result.
     *
     * @param plan - The execution plan to run.
     * @returns Validated ExecutionResult.
     */
    async execute(plan, behavior) {
        this.consecutiveFailures = 0;
        const stepResults = [];
        const stepMap = new Map(plan.steps.map((s) => [s.stepId, s]));
        const completedResults = new Map();
        const confidenceThreshold = behavior?.confidenceThreshold ?? 0;
        for (const group of plan.parallelGroups) {
            // Circuit breaker check
            if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
                this.log.warn({ consecutiveFailures: this.consecutiveFailures }, "Circuit breaker tripped — aborting remaining steps");
                // Mark remaining steps as failed
                for (const stepId of group) {
                    stepResults.push({
                        stepId,
                        success: false,
                        data: null,
                        error: "Circuit breaker tripped — execution aborted",
                    });
                }
                continue;
            }
            const stepsInGroup = group
                .map((id) => stepMap.get(id))
                .filter((s) => s !== undefined);
            if (this.parallelExecution && stepsInGroup.length > 1) {
                const results = await Promise.allSettled(stepsInGroup.map((step) => {
                    if (confidenceThreshold > 0 && step.estimatedConfidence < confidenceThreshold) {
                        return Promise.resolve({
                            stepId: step.stepId,
                            success: true,
                            data: `[SKIPPED] Confidence ${step.estimatedConfidence.toFixed(2)} below threshold ${confidenceThreshold.toFixed(2)}`,
                        });
                    }
                    return this.executeStepWithRetry(step, completedResults);
                }));
                for (let i = 0; i < stepsInGroup.length; i++) {
                    const settled = results[i];
                    const stepId = stepsInGroup[i].stepId;
                    let result;
                    if (settled.status === "fulfilled") {
                        result = settled.value;
                    }
                    else {
                        result = {
                            stepId,
                            success: false,
                            data: null,
                            error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
                        };
                    }
                    stepResults.push(result);
                    completedResults.set(stepId, result);
                    this.updateCircuitBreaker(result.success);
                }
            }
            else {
                // Sequential execution
                for (const step of stepsInGroup) {
                    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
                        stepResults.push({
                            stepId: step.stepId,
                            success: false,
                            data: null,
                            error: "Circuit breaker tripped — execution aborted",
                        });
                        continue;
                    }
                    if (confidenceThreshold > 0 && step.estimatedConfidence < confidenceThreshold) {
                        const result = {
                            stepId: step.stepId,
                            success: true,
                            data: `[SKIPPED] Confidence ${step.estimatedConfidence.toFixed(2)} below threshold ${confidenceThreshold.toFixed(2)}`,
                        };
                        stepResults.push(result);
                        completedResults.set(step.stepId, result);
                        continue;
                    }
                    const result = await this.executeStepWithRetry(step, completedResults);
                    stepResults.push(result);
                    completedResults.set(step.stepId, result);
                    this.updateCircuitBreaker(result.success);
                }
            }
        }
        const allSuccess = stepResults.every((r) => r.success);
        const lastResult = stepResults[stepResults.length - 1];
        // Learn from successful execution
        if (allSuccess) {
            this.learnFromSuccess(plan).catch((err) => {
                this.log.warn({ err }, "Failed to store learned procedure");
            });
        }
        return shared_1.ExecutionResultSchema.parse({
            success: allSuccess,
            stepResults,
            finalResult: lastResult?.data,
        });
    }
    /** Execute a single step with retry logic. */
    async executeStepWithRetry(step, completedResults) {
        // Validate dependencies
        for (const depId of step.dependsOn) {
            const dep = completedResults.get(depId);
            if (!dep || !dep.success) {
                return {
                    stepId: step.stepId,
                    success: false,
                    data: null,
                    error: `Dependency step ${depId} not satisfied`,
                };
            }
        }
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            if (attempt > 0) {
                this.log.debug({ stepId: step.stepId, attempt }, "Retrying step");
            }
            const result = await this.executeStep(step);
            if (result.success)
                return result;
            lastError = result.error;
        }
        // All retries exhausted — try fallback
        if (step.fallbackAction) {
            this.log.debug({ stepId: step.stepId }, "Attempting fallback action");
            return this.executeFallback(step);
        }
        return {
            stepId: step.stepId,
            success: false,
            data: null,
            error: lastError ?? "Step failed after all retries",
        };
    }
    /** Execute a single plan step. */
    async executeStep(step) {
        const start = Date.now();
        try {
            let data;
            switch (step.actionType) {
                case "tool_call": {
                    if (!step.toolName) {
                        return {
                            stepId: step.stepId,
                            success: false,
                            data: null,
                            error: "tool_call step missing toolName",
                        };
                    }
                    const toolResult = await this.withTimeout(this.mcp.callTool(step.toolName, step.toolArguments ?? {}), this.stepTimeoutMs);
                    if (!toolResult.success) {
                        return {
                            stepId: step.stepId,
                            success: false,
                            data: toolResult.data,
                            error: toolResult.error ?? "Tool call failed",
                            durationMs: Date.now() - start,
                        };
                    }
                    data = toolResult.data;
                    break;
                }
                case "memory_lookup": {
                    const memories = await this.memory.recall(step.description, 5);
                    data = memories;
                    break;
                }
                case "reasoning":
                case "response":
                    // These are resolved directly — the description is the output
                    data = step.description;
                    break;
                default:
                    return {
                        stepId: step.stepId,
                        success: false,
                        data: null,
                        error: `Unknown action type: ${step.actionType}`,
                        durationMs: Date.now() - start,
                    };
            }
            return {
                stepId: step.stepId,
                success: true,
                data,
                durationMs: Date.now() - start,
            };
        }
        catch (err) {
            return {
                stepId: step.stepId,
                success: false,
                data: null,
                error: err instanceof Error ? err.message : String(err),
                durationMs: Date.now() - start,
            };
        }
    }
    /** Execute the fallback action for a step. */
    async executeFallback(step) {
        const start = Date.now();
        return {
            stepId: step.stepId,
            success: true,
            data: `[FALLBACK] ${step.fallbackAction}`,
            durationMs: Date.now() - start,
        };
    }
    /** Wrap a promise with a timeout. */
    withTimeout(promise, ms) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new shared_2.BaseError(`Step timed out after ${ms}ms`, { code: "TIMEOUT" })), ms);
            promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
        });
    }
    /** Update circuit breaker state. */
    updateCircuitBreaker(success) {
        if (success) {
            this.consecutiveFailures = 0;
        }
        else {
            this.consecutiveFailures++;
        }
    }
    /** Store a learned procedure from a successful plan execution. */
    async learnFromSuccess(plan) {
        await this.memory.learn({
            id: (0, node_crypto_1.randomUUID)(),
            name: `procedure_${Date.now()}`,
            description: plan.goal,
            steps: plan.steps.map((s) => s.description),
            preconditions: [],
            postconditions: [],
            successRate: 1.0,
            executionCount: 1,
            lastUsed: Date.now(),
            tags: [plan.steps[0]?.actionType ?? "general"],
        });
    }
}
exports.ExecutionEngine = ExecutionEngine;
//# sourceMappingURL=execution-engine.js.map