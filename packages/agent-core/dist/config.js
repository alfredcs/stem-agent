"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCoreConfigSchema = void 0;
const zod_1 = require("zod");
const shared_1 = require("@stem-agent/shared");
/**
 * Engine-specific configuration for the agent core.
 * Extends the base AgentConfig with knobs for perception, reasoning,
 * planning, and execution engines.
 */
exports.AgentCoreConfigSchema = zod_1.z.object({
    /** Base agent configuration from shared. */
    agent: shared_1.AgentConfigSchema.default({}),
    /** Maximum reasoning steps per strategy invocation. */
    maxReasoningSteps: zod_1.z.number().int().positive().default(6),
    /** Maximum steps allowed in a single execution plan. */
    maxPlanSteps: zod_1.z.number().int().positive().default(10),
    /** Number of retries per failed execution step. */
    maxExecutionRetries: zod_1.z.number().int().min(0).default(2),
    /** Whether to execute independent plan steps in parallel. */
    parallelExecution: zod_1.z.boolean().default(true),
    /** Whether plans require explicit approval before execution. */
    planApprovalRequired: zod_1.z.boolean().default(false),
    /** Consecutive step failures before circuit breaker trips. */
    circuitBreakerThreshold: zod_1.z.number().int().positive().default(3),
    /** Timeout per execution step in milliseconds. */
    stepTimeoutMs: zod_1.z.number().int().positive().default(30_000),
    /** Minimum confidence to accept a reasoning conclusion. */
    confidenceThreshold: zod_1.z.number().min(0).max(1).default(0.7),
});
//# sourceMappingURL=config.js.map