import { z } from "zod";
export declare const LLMConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["amazon_bedrock", "anthropic", "openai"]>>;
    models: z.ZodDefault<z.ZodObject<{
        perception: z.ZodDefault<z.ZodString>;
        reasoning: z.ZodDefault<z.ZodString>;
        planning: z.ZodDefault<z.ZodString>;
        formatting: z.ZodDefault<z.ZodString>;
        evaluation: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        perception: string;
        reasoning: string;
        planning: string;
        formatting: string;
        evaluation: string;
    }, {
        perception?: string | undefined;
        reasoning?: string | undefined;
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
        perception: string;
        reasoning: string;
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
        perception?: string | undefined;
        reasoning?: string | undefined;
        planning?: string | undefined;
        formatting?: string | undefined;
        evaluation?: string | undefined;
    } | undefined;
    default?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
}>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export declare const EmbeddingConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["openai", "bedrock", "local"]>>;
    model: z.ZodDefault<z.ZodString>;
    apiKey: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
}, "strip", z.ZodTypeAny, {
    provider: "openai" | "bedrock" | "local";
    model: string;
    apiKey?: string | undefined;
}, {
    provider?: "openai" | "bedrock" | "local" | undefined;
    model?: string | undefined;
    apiKey?: string | undefined;
}>;
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export declare const CostConfigSchema: z.ZodObject<{
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
}>;
export type CostConfig = z.infer<typeof CostConfigSchema>;
export declare const ServerConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    maxConcurrentTasks: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    maxConcurrentTasks: number;
}, {
    host?: string | undefined;
    port?: number | undefined;
    maxConcurrentTasks?: number | undefined;
}>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export declare const AgentConfigSchema: z.ZodObject<{
    agent: z.ZodDefault<z.ZodObject<{
        agentId: z.ZodDefault<z.ZodString>;
        name: z.ZodDefault<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        agentId: string;
        name: string;
        version: string;
        description: string;
    }, {
        agentId?: string | undefined;
        name?: string | undefined;
        version?: string | undefined;
        description?: string | undefined;
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
            perception: string;
            reasoning: string;
            planning: string;
            formatting: string;
            evaluation: string;
        }, {
            perception?: string | undefined;
            reasoning?: string | undefined;
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
            perception: string;
            reasoning: string;
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
            perception?: string | undefined;
            reasoning?: string | undefined;
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
        provider?: "openai" | "bedrock" | "local" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
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
        host: string;
        port: number;
        maxConcurrentTasks: number;
    }, {
        host?: string | undefined;
        port?: number | undefined;
        maxConcurrentTasks?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    agent: {
        agentId: string;
        name: string;
        version: string;
        description: string;
    };
    llm: {
        provider: "amazon_bedrock" | "anthropic" | "openai";
        models: {
            perception: string;
            reasoning: string;
            planning: string;
            formatting: string;
            evaluation: string;
        };
        default: string;
        temperature: number;
        maxTokens: number;
    };
    embedding: {
        provider: "openai" | "bedrock" | "local";
        model: string;
        apiKey?: string | undefined;
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
        host: string;
        port: number;
        maxConcurrentTasks: number;
    };
}, {
    agent?: {
        agentId?: string | undefined;
        name?: string | undefined;
        version?: string | undefined;
        description?: string | undefined;
    } | undefined;
    llm?: {
        provider?: "amazon_bedrock" | "anthropic" | "openai" | undefined;
        models?: {
            perception?: string | undefined;
            reasoning?: string | undefined;
            planning?: string | undefined;
            formatting?: string | undefined;
            evaluation?: string | undefined;
        } | undefined;
        default?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
    } | undefined;
    embedding?: {
        provider?: "openai" | "bedrock" | "local" | undefined;
        model?: string | undefined;
        apiKey?: string | undefined;
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
        host?: string | undefined;
        port?: number | undefined;
        maxConcurrentTasks?: number | undefined;
    } | undefined;
}>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
//# sourceMappingURL=config.d.ts.map