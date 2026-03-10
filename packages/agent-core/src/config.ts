import { z } from "zod";
import { AgentConfigSchema } from "@stem-agent/shared";

/**
 * Engine-specific configuration for the agent core.
 * Extends the base AgentConfig with knobs for perception, reasoning,
 * planning, and execution engines.
 */
export const AgentCoreConfigSchema = z.object({
  /** Base agent configuration from shared. */
  agent: AgentConfigSchema.default({}),

  /** Maximum reasoning steps per strategy invocation. */
  maxReasoningSteps: z.number().int().positive().default(6),

  /** Maximum steps allowed in a single execution plan. */
  maxPlanSteps: z.number().int().positive().default(10),

  /** Number of retries per failed execution step. */
  maxExecutionRetries: z.number().int().min(0).default(2),

  /** Whether to execute independent plan steps in parallel. */
  parallelExecution: z.boolean().default(true),

  /** Whether plans require explicit approval before execution. */
  planApprovalRequired: z.boolean().default(false),

  /** Consecutive step failures before circuit breaker trips. */
  circuitBreakerThreshold: z.number().int().positive().default(3),

  /** Timeout per execution step in milliseconds. */
  stepTimeoutMs: z.number().int().positive().default(30_000),

  /** Minimum confidence to accept a reasoning conclusion. */
  confidenceThreshold: z.number().min(0).max(1).default(0.7),
});

export type AgentCoreConfig = z.infer<typeof AgentCoreConfigSchema>;
