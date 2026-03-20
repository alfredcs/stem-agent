import { z } from "zod";
/**
 * Engine-specific configuration for the agent core.
 * Extends the base AgentConfig with knobs for perception, reasoning,
 * planning, and execution engines.
 */
export declare const AgentCoreConfigSchema: z.ZodObject<{
    /** Base agent configuration from shared. */
    agent: z.ZodDefault<z.ZodObject<{
        agent: z.ZodDefault<z.ZodObject<{
            agentId: z.ZodDefault<z.ZodString>;
            name: z.ZodDefault<z.ZodString>;
            version: z.ZodDefault<z.ZodString>;
            description: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description: string;
            agentId: string;
            version: string;
        }, {
            name?: string | undefined;
            description?: string | undefined;
            agentId?: string | undefined;
            version?: string | undefined;
        }>>;
        llm: z.ZodDefault<z.ZodObject<{
            provider: z.ZodDefault<z.ZodEnum<["amazon_bedrock", "anthropic", "openai"]>>;
            models: z.ZodDefault<z.ZodObject<{
                perception: z.ZodDefault<z.ZodString>;
                reasoning: z.ZodDefault<z.ZodString>;
                planning: z.ZodDefault<z.ZodString>;
                formatting: z.ZodDefault<z.ZodString>;
                evaluation: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                reasoning: string;
                perception: string;
                planning: string;
                formatting: string;
                evaluation: string;
            }, {
                reasoning?: string | undefined;
                perception?: string | undefined;
                planning?: string | undefined;
                formatting?: string | undefined;
                evaluation?: string | undefined;
            }>>;
            default: z.ZodDefault<z.ZodString>;
            temperature: z.ZodDefault<z.ZodNumber>;
            maxTokens: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            provider: "amazon_bedrock" | "anthropic" | "openai";
            models: {
                reasoning: string;
                perception: string;
                planning: string;
                formatting: string;
                evaluation: string;
            };
            default: string;
            temperature: number;
            maxTokens: number;
        }, {
            provider?: "amazon_bedrock" | "anthropic" | "openai" | undefined;
            models?: {
                reasoning?: string | undefined;
                perception?: string | undefined;
                planning?: string | undefined;
                formatting?: string | undefined;
                evaluation?: string | undefined;
            } | undefined;
            default?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
        }>>;
        embedding: z.ZodDefault<z.ZodObject<{
            provider: z.ZodDefault<z.ZodEnum<["openai", "bedrock", "local"]>>;
            model: z.ZodDefault<z.ZodString>;
            apiKey: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        }, "strip", z.ZodTypeAny, {
            provider: "openai" | "bedrock" | "local";
            model: string;
            apiKey?: string | undefined;
        }, {
            apiKey?: string | undefined;
            provider?: "openai" | "bedrock" | "local" | undefined;
            model?: string | undefined;
        }>>;
        cost: z.ZodDefault<z.ZodObject<{
            maxLlmCallsPerInteraction: z.ZodDefault<z.ZodNumber>;
            maxCostPerInteractionUsd: z.ZodDefault<z.ZodNumber>;
            maxCostPerUserDailyUsd: z.ZodDefault<z.ZodNumber>;
            monthlyBudgetUsd: z.ZodDefault<z.ZodNumber>;
            alertThresholds: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            batchApi: z.ZodDefault<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                eligibleTasks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                eligibleTasks: string[];
            }, {
                enabled?: boolean | undefined;
                eligibleTasks?: string[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            maxLlmCallsPerInteraction: number;
            maxCostPerInteractionUsd: number;
            maxCostPerUserDailyUsd: number;
            monthlyBudgetUsd: number;
            alertThresholds: number[];
            batchApi: {
                enabled: boolean;
                eligibleTasks: string[];
            };
        }, {
            maxLlmCallsPerInteraction?: number | undefined;
            maxCostPerInteractionUsd?: number | undefined;
            maxCostPerUserDailyUsd?: number | undefined;
            monthlyBudgetUsd?: number | undefined;
            alertThresholds?: number[] | undefined;
            batchApi?: {
                enabled?: boolean | undefined;
                eligibleTasks?: string[] | undefined;
            } | undefined;
        }>>;
        server: z.ZodDefault<z.ZodObject<{
            host: z.ZodDefault<z.ZodString>;
            port: z.ZodDefault<z.ZodNumber>;
            maxConcurrentTasks: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxConcurrentTasks: number;
            host: string;
            port: number;
        }, {
            maxConcurrentTasks?: number | undefined;
            host?: string | undefined;
            port?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        agent: {
            name: string;
            description: string;
            agentId: string;
            version: string;
        };
        embedding: {
            provider: "openai" | "bedrock" | "local";
            model: string;
            apiKey?: string | undefined;
        };
        llm: {
            provider: "amazon_bedrock" | "anthropic" | "openai";
            models: {
                reasoning: string;
                perception: string;
                planning: string;
                formatting: string;
                evaluation: string;
            };
            default: string;
            temperature: number;
            maxTokens: number;
        };
        cost: {
            maxLlmCallsPerInteraction: number;
            maxCostPerInteractionUsd: number;
            maxCostPerUserDailyUsd: number;
            monthlyBudgetUsd: number;
            alertThresholds: number[];
            batchApi: {
                enabled: boolean;
                eligibleTasks: string[];
            };
        };
        server: {
            maxConcurrentTasks: number;
            host: string;
            port: number;
        };
    }, {
        agent?: {
            name?: string | undefined;
            description?: string | undefined;
            agentId?: string | undefined;
            version?: string | undefined;
        } | undefined;
        embedding?: {
            apiKey?: string | undefined;
            provider?: "openai" | "bedrock" | "local" | undefined;
            model?: string | undefined;
        } | undefined;
        llm?: {
            provider?: "amazon_bedrock" | "anthropic" | "openai" | undefined;
            models?: {
                reasoning?: string | undefined;
                perception?: string | undefined;
                planning?: string | undefined;
                formatting?: string | undefined;
                evaluation?: string | undefined;
            } | undefined;
            default?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
        } | undefined;
        cost?: {
            maxLlmCallsPerInteraction?: number | undefined;
            maxCostPerInteractionUsd?: number | undefined;
            maxCostPerUserDailyUsd?: number | undefined;
            monthlyBudgetUsd?: number | undefined;
            alertThresholds?: number[] | undefined;
            batchApi?: {
                enabled?: boolean | undefined;
                eligibleTasks?: string[] | undefined;
            } | undefined;
        } | undefined;
        server?: {
            maxConcurrentTasks?: number | undefined;
            host?: string | undefined;
            port?: number | undefined;
        } | undefined;
    }>>;
    /** Maximum reasoning steps per strategy invocation. */
    maxReasoningSteps: z.ZodDefault<z.ZodNumber>;
    /** Maximum steps allowed in a single execution plan. */
    maxPlanSteps: z.ZodDefault<z.ZodNumber>;
    /** Number of retries per failed execution step. */
    maxExecutionRetries: z.ZodDefault<z.ZodNumber>;
    /** Whether to execute independent plan steps in parallel. */
    parallelExecution: z.ZodDefault<z.ZodBoolean>;
    /** Whether plans require explicit approval before execution. */
    planApprovalRequired: z.ZodDefault<z.ZodBoolean>;
    /** Consecutive step failures before circuit breaker trips. */
    circuitBreakerThreshold: z.ZodDefault<z.ZodNumber>;
    /** Timeout per execution step in milliseconds. */
    stepTimeoutMs: z.ZodDefault<z.ZodNumber>;
    /** Minimum confidence to accept a reasoning conclusion. */
    confidenceThreshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    agent: {
        agent: {
            name: string;
            description: string;
            agentId: string;
            version: string;
        };
        embedding: {
            provider: "openai" | "bedrock" | "local";
            model: string;
            apiKey?: string | undefined;
        };
        llm: {
            provider: "amazon_bedrock" | "anthropic" | "openai";
            models: {
                reasoning: string;
                perception: string;
                planning: string;
                formatting: string;
                evaluation: string;
            };
            default: string;
            temperature: number;
            maxTokens: number;
        };
        cost: {
            maxLlmCallsPerInteraction: number;
            maxCostPerInteractionUsd: number;
            maxCostPerUserDailyUsd: number;
            monthlyBudgetUsd: number;
            alertThresholds: number[];
            batchApi: {
                enabled: boolean;
                eligibleTasks: string[];
            };
        };
        server: {
            maxConcurrentTasks: number;
            host: string;
            port: number;
        };
    };
    maxReasoningSteps: number;
    maxPlanSteps: number;
    maxExecutionRetries: number;
    parallelExecution: boolean;
    planApprovalRequired: boolean;
    circuitBreakerThreshold: number;
    stepTimeoutMs: number;
    confidenceThreshold: number;
}, {
    agent?: {
        agent?: {
            name?: string | undefined;
            description?: string | undefined;
            agentId?: string | undefined;
            version?: string | undefined;
        } | undefined;
        embedding?: {
            apiKey?: string | undefined;
            provider?: "openai" | "bedrock" | "local" | undefined;
            model?: string | undefined;
        } | undefined;
        llm?: {
            provider?: "amazon_bedrock" | "anthropic" | "openai" | undefined;
            models?: {
                reasoning?: string | undefined;
                perception?: string | undefined;
                planning?: string | undefined;
                formatting?: string | undefined;
                evaluation?: string | undefined;
            } | undefined;
            default?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
        } | undefined;
        cost?: {
            maxLlmCallsPerInteraction?: number | undefined;
            maxCostPerInteractionUsd?: number | undefined;
            maxCostPerUserDailyUsd?: number | undefined;
            monthlyBudgetUsd?: number | undefined;
            alertThresholds?: number[] | undefined;
            batchApi?: {
                enabled?: boolean | undefined;
                eligibleTasks?: string[] | undefined;
            } | undefined;
        } | undefined;
        server?: {
            maxConcurrentTasks?: number | undefined;
            host?: string | undefined;
            port?: number | undefined;
        } | undefined;
    } | undefined;
    maxReasoningSteps?: number | undefined;
    maxPlanSteps?: number | undefined;
    maxExecutionRetries?: number | undefined;
    parallelExecution?: boolean | undefined;
    planApprovalRequired?: boolean | undefined;
    circuitBreakerThreshold?: number | undefined;
    stepTimeoutMs?: number | undefined;
    confidenceThreshold?: number | undefined;
}>;
export type AgentCoreConfig = z.infer<typeof AgentCoreConfigSchema>;
//# sourceMappingURL=config.d.ts.map