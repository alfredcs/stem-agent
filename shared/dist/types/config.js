"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConfigSchema = exports.ServerConfigSchema = exports.CostConfigSchema = exports.EmbeddingConfigSchema = exports.LLMConfigSchema = void 0;
const zod_1 = require("zod");
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
exports.LLMConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum(["amazon_bedrock", "anthropic", "openai"])
        .default(env("LLM_PROVIDER", "amazon_bedrock")),
    models: zod_1.z.object({
        perception: zod_1.z.string().default(env("LLM_MODEL_PERCEPTION", "us.anthropic.claude-haiku-4-5-20250929-v1")),
        reasoning: zod_1.z.string().default(env("LLM_MODEL_REASONING", "us.anthropic.claude-opus-4-6-v1")),
        planning: zod_1.z.string().default(env("LLM_MODEL_PLANNING", "us.anthropic.claude-opus-4-6-v1")),
        formatting: zod_1.z.string().default(env("LLM_MODEL_FORMATTING", "us.anthropic.claude-haiku-4-5-20250929-v1")),
        evaluation: zod_1.z.string().default(env("LLM_MODEL_EVALUATION", "us.anthropic.claude-opus-4-6-v1")),
    }).default({}),
    default: zod_1.z.string().default(env("LLM_MODEL_DEFAULT", "us.anthropic.claude-sonnet-4-5-20250929-v1")),
    temperature: zod_1.z.number().min(0).max(2).default(envNum("LLM_TEMPERATURE", 0.7)),
    maxTokens: zod_1.z.number().int().positive().default(envNum("LLM_MAX_TOKENS", 4096)),
});
exports.EmbeddingConfigSchema = zod_1.z.object({
    provider: zod_1.z.enum(["openai", "bedrock", "local"])
        .default(env("EMBEDDING_PROVIDER", "openai")),
    model: zod_1.z.string().default(env("EMBEDDING_MODEL", "text-embedding-3-small")),
    apiKey: zod_1.z.string().optional().transform((v) => v || process.env["EMBEDDING_API_KEY"] || process.env["OPENAI_API_KEY"]),
});
exports.CostConfigSchema = zod_1.z.object({
    maxLlmCallsPerInteraction: zod_1.z.number().int().default(envNum("COST_MAX_LLM_CALLS", 20)),
    maxCostPerInteractionUsd: zod_1.z.number().default(envNum("COST_MAX_PER_INTERACTION_USD", 0.5)),
    maxCostPerUserDailyUsd: zod_1.z.number().default(envNum("COST_MAX_PER_USER_DAILY_USD", 10.0)),
    monthlyBudgetUsd: zod_1.z.number().default(envNum("COST_MONTHLY_BUDGET_USD", 2000.0)),
    alertThresholds: zod_1.z.array(zod_1.z.number()).default([0.5, 0.75, 0.9]),
    batchApi: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        eligibleTasks: zod_1.z.array(zod_1.z.string()).default([
            "learning", "consolidation", "proactive_learning", "evaluation",
        ]),
    }).default({}),
});
exports.ServerConfigSchema = zod_1.z.object({
    host: zod_1.z.string().default(env("HOST", "127.0.0.1")),
    port: zod_1.z.number().int().default(envNum("PORT", 8000)),
    maxConcurrentTasks: zod_1.z.number().int().default(envNum("MAX_CONCURRENT_TASKS", 10)),
});
exports.AgentConfigSchema = zod_1.z.object({
    agent: zod_1.z.object({
        agentId: zod_1.z.string().default(env("AGENT_ID", "stem-agent-001")),
        name: zod_1.z.string().default(env("AGENT_NAME", "STEM Adaptive Agent")),
        version: zod_1.z.string().default(env("AGENT_VERSION", "0.1.0")),
        description: zod_1.z.string().default(env("AGENT_DESCRIPTION", "Self-adaptive general-purpose agent")),
    }).default({}),
    llm: exports.LLMConfigSchema.default({}),
    embedding: exports.EmbeddingConfigSchema.default({}),
    cost: exports.CostConfigSchema.default({}),
    server: exports.ServerConfigSchema.default({}),
});
//# sourceMappingURL=config.js.map