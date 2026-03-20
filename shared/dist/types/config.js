import { z } from "zod";
// ---------------------------------------------------------------------------
// Helpers — read configuration from environment with fallbacks
// ---------------------------------------------------------------------------
function env(key, fallback) {
    return process.env[key] ?? fallback;
}
function envNum(key, fallback) {
    const v = process.env[key];
    return v !== undefined ? Number(v) : fallback;
}
// ---------------------------------------------------------------------------
// Agent Configuration (from design doc Sec 12.1)
//
// All values are read from environment variables at schema parse time.
// Users configure them via a `.env` file — see `env.example`.
// ---------------------------------------------------------------------------
export const LLMConfigSchema = z.object({
    provider: z.enum(["amazon_bedrock", "anthropic", "openai"])
        .default(env("LLM_PROVIDER", "amazon_bedrock")),
    models: z.object({
        perception: z.string().default(env("LLM_MODEL_PERCEPTION", "us.anthropic.claude-haiku-4-5-20250929-v1")),
        reasoning: z.string().default(env("LLM_MODEL_REASONING", "us.anthropic.claude-opus-4-6-v1")),
        planning: z.string().default(env("LLM_MODEL_PLANNING", "us.anthropic.claude-opus-4-6-v1")),
        formatting: z.string().default(env("LLM_MODEL_FORMATTING", "us.anthropic.claude-haiku-4-5-20250929-v1")),
        evaluation: z.string().default(env("LLM_MODEL_EVALUATION", "us.anthropic.claude-opus-4-6-v1")),
    }).default({}),
    default: z.string().default(env("LLM_MODEL_DEFAULT", "us.anthropic.claude-sonnet-4-5-20250929-v1")),
    temperature: z.number().min(0).max(2).default(envNum("LLM_TEMPERATURE", 0.7)),
    maxTokens: z.number().int().positive().default(envNum("LLM_MAX_TOKENS", 4096)),
});
export const EmbeddingConfigSchema = z.object({
    provider: z.enum(["openai", "bedrock", "local"])
        .default(env("EMBEDDING_PROVIDER", "openai")),
    model: z.string().default(env("EMBEDDING_MODEL", "text-embedding-3-small")),
    apiKey: z.string().optional().transform((v) => v || process.env["EMBEDDING_API_KEY"] || process.env["OPENAI_API_KEY"]),
});
export const CostConfigSchema = z.object({
    maxLlmCallsPerInteraction: z.number().int().default(envNum("COST_MAX_LLM_CALLS", 20)),
    maxCostPerInteractionUsd: z.number().default(envNum("COST_MAX_PER_INTERACTION_USD", 0.5)),
    maxCostPerUserDailyUsd: z.number().default(envNum("COST_MAX_PER_USER_DAILY_USD", 10.0)),
    monthlyBudgetUsd: z.number().default(envNum("COST_MONTHLY_BUDGET_USD", 2000.0)),
    alertThresholds: z.array(z.number()).default([0.5, 0.75, 0.9]),
    batchApi: z.object({
        enabled: z.boolean().default(true),
        eligibleTasks: z.array(z.string()).default([
            "learning", "consolidation", "proactive_learning", "evaluation",
        ]),
    }).default({}),
});
export const ServerConfigSchema = z.object({
    host: z.string().default(env("HOST", "127.0.0.1")),
    port: z.number().int().default(envNum("PORT", 8000)),
    maxConcurrentTasks: z.number().int().default(envNum("MAX_CONCURRENT_TASKS", 10)),
});
export const AgentConfigSchema = z.object({
    agent: z.object({
        agentId: z.string().default(env("AGENT_ID", "stem-agent-001")),
        name: z.string().default(env("AGENT_NAME", "STEM Adaptive Agent")),
        version: z.string().default(env("AGENT_VERSION", "0.1.0")),
        description: z.string().default(env("AGENT_DESCRIPTION", "Self-adaptive general-purpose agent")),
    }).default({}),
    llm: LLMConfigSchema.default({}),
    embedding: EmbeddingConfigSchema.default({}),
    cost: CostConfigSchema.default({}),
    server: ServerConfigSchema.default({}),
});
//# sourceMappingURL=config.js.map