import { z } from "zod";
// ---------------------------------------------------------------------------
// Perception (from design doc Sec 5)
// ---------------------------------------------------------------------------
export const PerceptionResultSchema = z.object({
    intent: z.string(),
    complexity: z.enum(["simple", "medium", "complex"]),
    urgency: z.enum(["low", "medium", "high"]).default("medium"),
    domain: z.string().optional(),
    entities: z.array(z.object({
        name: z.string(),
        type: z.string(),
        value: z.unknown(),
    })).default([]),
    callerStyleSignals: z.record(z.number()).default({}),
    context: z.record(z.unknown()).default({}),
    metadata: z.record(z.unknown()).default({}),
    sentiment: z.enum(["positive", "neutral", "negative"]).default("neutral"),
    ambiguityScore: z.number().min(0).max(1).default(0),
    requiresClarification: z.boolean().default(false),
    detectedLanguage: z.string().default("en"),
});
// ---------------------------------------------------------------------------
// Reasoning (from design doc Sec 6)
// ---------------------------------------------------------------------------
export const ReasoningStrategy = z.enum([
    "chain_of_thought",
    "react",
    "reflexion",
    "tree_of_thought", // PLANNED
    "internal_debate",
    "analogical", // PLANNED
]);
export const ReasoningStepSchema = z.object({
    stepId: z.number().int(),
    thought: z.string(),
    action: z.string().optional(),
    observation: z.string().optional(),
    confidence: z.number().min(0).max(1),
});
export const ReasoningResultSchema = z.object({
    conclusion: z.string(),
    confidence: z.number().min(0).max(1),
    strategyUsed: ReasoningStrategy,
    steps: z.array(ReasoningStepSchema).default([]),
    evidence: z.array(z.string()).default([]),
    alternativeConclusions: z.array(z.string()).default([]),
    trace: z.array(z.string()).default([]),
});
// ---------------------------------------------------------------------------
// Planning (from design doc Sec 10)
// ---------------------------------------------------------------------------
export const PlanStepSchema = z.object({
    stepId: z.number().int(),
    actionType: z
        .enum(["tool_call", "reasoning", "memory_lookup", "response"])
        .default("tool_call"),
    description: z.string(),
    toolName: z.string().optional(),
    toolArguments: z.record(z.unknown()).optional(),
    dependsOn: z.array(z.number().int()).default([]),
    fallbackAction: z.string().optional(),
    estimatedConfidence: z.number().min(0).max(1).default(0.8),
});
export const ExecutionPlanSchema = z.object({
    goal: z.string(),
    steps: z.array(PlanStepSchema),
    estimatedTotalConfidence: z.number().min(0).max(1),
    parallelGroups: z.array(z.array(z.number().int())).default([]),
    rollbackStrategy: z.string().optional(),
    estimatedCostUsd: z.number().optional(),
});
// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
export const StepResultSchema = z.object({
    stepId: z.number().int(),
    success: z.boolean(),
    data: z.unknown(),
    error: z.string().optional(),
    durationMs: z.number().optional(),
});
export const ExecutionResultSchema = z.object({
    success: z.boolean(),
    stepResults: z.array(StepResultSchema),
    finalResult: z.unknown().optional(),
});
// ---------------------------------------------------------------------------
// Behavior Parameters (from design doc Sec 3.2)
// ---------------------------------------------------------------------------
export const BehaviorParametersSchema = z.object({
    reasoningDepth: z.number().int().default(3),
    explorationVsExploitation: z.number().default(0.3),
    verbosityLevel: z.number().default(0.5),
    confidenceThreshold: z.number().default(0.7),
    toolUsePreference: z.number().default(0.5),
    creativityLevel: z.number().default(0.5),
    proactiveSuggestion: z.boolean().default(true),
    selfReflectionFrequency: z.number().int().default(5),
    maxPlanSteps: z.number().int().default(10),
    memoryRetrievalBreadth: z.number().int().default(10),
});
// ---------------------------------------------------------------------------
// Caller Adaptation
// ---------------------------------------------------------------------------
export const CallerAdaptationSchema = z.object({
    responseStyle: z.record(z.unknown()).default({}),
    reasoningAdjustments: z.record(z.unknown()).default({}),
    preferences: z.record(z.unknown()).default({}),
});
//# sourceMappingURL=agent-core.js.map