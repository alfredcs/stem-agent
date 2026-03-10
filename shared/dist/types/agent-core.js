"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallerAdaptationSchema = exports.BehaviorParametersSchema = exports.ExecutionResultSchema = exports.StepResultSchema = exports.ExecutionPlanSchema = exports.PlanStepSchema = exports.ReasoningResultSchema = exports.ReasoningStepSchema = exports.ReasoningStrategy = exports.PerceptionResultSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Perception (from design doc Sec 5)
// ---------------------------------------------------------------------------
exports.PerceptionResultSchema = zod_1.z.object({
    intent: zod_1.z.string(),
    complexity: zod_1.z.enum(["simple", "medium", "complex"]),
    urgency: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
    domain: zod_1.z.string().optional(),
    entities: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.string(),
        value: zod_1.z.unknown(),
    })).default([]),
    callerStyleSignals: zod_1.z.record(zod_1.z.number()).default({}),
    context: zod_1.z.record(zod_1.z.unknown()).default({}),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
    sentiment: zod_1.z.enum(["positive", "neutral", "negative"]).default("neutral"),
    ambiguityScore: zod_1.z.number().min(0).max(1).default(0),
    requiresClarification: zod_1.z.boolean().default(false),
    detectedLanguage: zod_1.z.string().default("en"),
});
// ---------------------------------------------------------------------------
// Reasoning (from design doc Sec 6)
// ---------------------------------------------------------------------------
exports.ReasoningStrategy = zod_1.z.enum([
    "chain_of_thought",
    "react",
    "reflexion",
    "tree_of_thought", // PLANNED
    "internal_debate",
    "analogical", // PLANNED
]);
exports.ReasoningStepSchema = zod_1.z.object({
    stepId: zod_1.z.number().int(),
    thought: zod_1.z.string(),
    action: zod_1.z.string().optional(),
    observation: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1),
});
exports.ReasoningResultSchema = zod_1.z.object({
    conclusion: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    strategyUsed: exports.ReasoningStrategy,
    steps: zod_1.z.array(exports.ReasoningStepSchema).default([]),
    evidence: zod_1.z.array(zod_1.z.string()).default([]),
    alternativeConclusions: zod_1.z.array(zod_1.z.string()).default([]),
    trace: zod_1.z.array(zod_1.z.string()).default([]),
});
// ---------------------------------------------------------------------------
// Planning (from design doc Sec 10)
// ---------------------------------------------------------------------------
exports.PlanStepSchema = zod_1.z.object({
    stepId: zod_1.z.number().int(),
    actionType: zod_1.z
        .enum(["tool_call", "reasoning", "memory_lookup", "response"])
        .default("tool_call"),
    description: zod_1.z.string(),
    toolName: zod_1.z.string().optional(),
    toolArguments: zod_1.z.record(zod_1.z.unknown()).optional(),
    dependsOn: zod_1.z.array(zod_1.z.number().int()).default([]),
    fallbackAction: zod_1.z.string().optional(),
    estimatedConfidence: zod_1.z.number().min(0).max(1).default(0.8),
});
exports.ExecutionPlanSchema = zod_1.z.object({
    goal: zod_1.z.string(),
    steps: zod_1.z.array(exports.PlanStepSchema),
    estimatedTotalConfidence: zod_1.z.number().min(0).max(1),
    parallelGroups: zod_1.z.array(zod_1.z.array(zod_1.z.number().int())).default([]),
    rollbackStrategy: zod_1.z.string().optional(),
    estimatedCostUsd: zod_1.z.number().optional(),
});
// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
exports.StepResultSchema = zod_1.z.object({
    stepId: zod_1.z.number().int(),
    success: zod_1.z.boolean(),
    data: zod_1.z.unknown(),
    error: zod_1.z.string().optional(),
    durationMs: zod_1.z.number().optional(),
});
exports.ExecutionResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    stepResults: zod_1.z.array(exports.StepResultSchema),
    finalResult: zod_1.z.unknown().optional(),
});
// ---------------------------------------------------------------------------
// Behavior Parameters (from design doc Sec 3.2)
// ---------------------------------------------------------------------------
exports.BehaviorParametersSchema = zod_1.z.object({
    reasoningDepth: zod_1.z.number().int().default(3),
    explorationVsExploitation: zod_1.z.number().default(0.3),
    verbosityLevel: zod_1.z.number().default(0.5),
    confidenceThreshold: zod_1.z.number().default(0.7),
    toolUsePreference: zod_1.z.number().default(0.5),
    creativityLevel: zod_1.z.number().default(0.5),
    proactiveSuggestion: zod_1.z.boolean().default(true),
    selfReflectionFrequency: zod_1.z.number().int().default(5),
    maxPlanSteps: zod_1.z.number().int().default(10),
    memoryRetrievalBreadth: zod_1.z.number().int().default(10),
});
// ---------------------------------------------------------------------------
// Caller Adaptation
// ---------------------------------------------------------------------------
exports.CallerAdaptationSchema = zod_1.z.object({
    responseStyle: zod_1.z.record(zod_1.z.unknown()).default({}),
    reasoningAdjustments: zod_1.z.record(zod_1.z.unknown()).default({}),
    preferences: zod_1.z.record(zod_1.z.unknown()).default({}),
});
//# sourceMappingURL=agent-core.js.map