import { z } from "zod";
export declare const PerceptionResultSchema: z.ZodObject<{
    intent: z.ZodString;
    complexity: z.ZodEnum<["simple", "medium", "complex"]>;
    urgency: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    domain: z.ZodOptional<z.ZodString>;
    entities: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodString;
        value: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: string;
        value?: unknown;
    }, {
        name: string;
        type: string;
        value?: unknown;
    }>, "many">>;
    callerStyleSignals: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    context: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    sentiment: z.ZodDefault<z.ZodEnum<["positive", "neutral", "negative"]>>;
    ambiguityScore: z.ZodDefault<z.ZodNumber>;
    requiresClarification: z.ZodDefault<z.ZodBoolean>;
    detectedLanguage: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    context: Record<string, unknown>;
    intent: string;
    complexity: "simple" | "medium" | "complex";
    urgency: "medium" | "low" | "high";
    entities: {
        name: string;
        type: string;
        value?: unknown;
    }[];
    callerStyleSignals: Record<string, number>;
    sentiment: "positive" | "neutral" | "negative";
    ambiguityScore: number;
    requiresClarification: boolean;
    detectedLanguage: string;
    domain?: string | undefined;
}, {
    intent: string;
    complexity: "simple" | "medium" | "complex";
    metadata?: Record<string, unknown> | undefined;
    context?: Record<string, unknown> | undefined;
    urgency?: "medium" | "low" | "high" | undefined;
    domain?: string | undefined;
    entities?: {
        name: string;
        type: string;
        value?: unknown;
    }[] | undefined;
    callerStyleSignals?: Record<string, number> | undefined;
    sentiment?: "positive" | "neutral" | "negative" | undefined;
    ambiguityScore?: number | undefined;
    requiresClarification?: boolean | undefined;
    detectedLanguage?: string | undefined;
}>;
export type PerceptionResult = z.infer<typeof PerceptionResultSchema>;
export declare const ReasoningStrategy: z.ZodEnum<["chain_of_thought", "react", "reflexion", "tree_of_thought", "internal_debate", "analogical"]>;
export type ReasoningStrategy = z.infer<typeof ReasoningStrategy>;
export declare const ReasoningStepSchema: z.ZodObject<{
    stepId: z.ZodNumber;
    thought: z.ZodString;
    action: z.ZodOptional<z.ZodString>;
    observation: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    stepId: number;
    thought: string;
    action?: string | undefined;
    observation?: string | undefined;
}, {
    confidence: number;
    stepId: number;
    thought: string;
    action?: string | undefined;
    observation?: string | undefined;
}>;
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
export declare const ReasoningResultSchema: z.ZodObject<{
    conclusion: z.ZodString;
    confidence: z.ZodNumber;
    strategyUsed: z.ZodEnum<["chain_of_thought", "react", "reflexion", "tree_of_thought", "internal_debate", "analogical"]>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        stepId: z.ZodNumber;
        thought: z.ZodString;
        action: z.ZodOptional<z.ZodString>;
        observation: z.ZodOptional<z.ZodString>;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        stepId: number;
        thought: string;
        action?: string | undefined;
        observation?: string | undefined;
    }, {
        confidence: number;
        stepId: number;
        thought: string;
        action?: string | undefined;
        observation?: string | undefined;
    }>, "many">>;
    evidence: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    alternativeConclusions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    trace: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    steps: {
        confidence: number;
        stepId: number;
        thought: string;
        action?: string | undefined;
        observation?: string | undefined;
    }[];
    conclusion: string;
    strategyUsed: "chain_of_thought" | "react" | "reflexion" | "tree_of_thought" | "internal_debate" | "analogical";
    evidence: string[];
    alternativeConclusions: string[];
    trace: string[];
}, {
    confidence: number;
    conclusion: string;
    strategyUsed: "chain_of_thought" | "react" | "reflexion" | "tree_of_thought" | "internal_debate" | "analogical";
    steps?: {
        confidence: number;
        stepId: number;
        thought: string;
        action?: string | undefined;
        observation?: string | undefined;
    }[] | undefined;
    evidence?: string[] | undefined;
    alternativeConclusions?: string[] | undefined;
    trace?: string[] | undefined;
}>;
export type ReasoningResult = z.infer<typeof ReasoningResultSchema>;
export declare const PlanStepSchema: z.ZodObject<{
    stepId: z.ZodNumber;
    actionType: z.ZodDefault<z.ZodEnum<["tool_call", "reasoning", "memory_lookup", "response"]>>;
    description: z.ZodString;
    toolName: z.ZodOptional<z.ZodString>;
    toolArguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dependsOn: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    fallbackAction: z.ZodOptional<z.ZodString>;
    estimatedConfidence: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    stepId: number;
    actionType: "tool_call" | "reasoning" | "memory_lookup" | "response";
    dependsOn: number[];
    estimatedConfidence: number;
    toolName?: string | undefined;
    toolArguments?: Record<string, unknown> | undefined;
    fallbackAction?: string | undefined;
}, {
    description: string;
    stepId: number;
    toolName?: string | undefined;
    actionType?: "tool_call" | "reasoning" | "memory_lookup" | "response" | undefined;
    toolArguments?: Record<string, unknown> | undefined;
    dependsOn?: number[] | undefined;
    fallbackAction?: string | undefined;
    estimatedConfidence?: number | undefined;
}>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export declare const ExecutionPlanSchema: z.ZodObject<{
    goal: z.ZodString;
    steps: z.ZodArray<z.ZodObject<{
        stepId: z.ZodNumber;
        actionType: z.ZodDefault<z.ZodEnum<["tool_call", "reasoning", "memory_lookup", "response"]>>;
        description: z.ZodString;
        toolName: z.ZodOptional<z.ZodString>;
        toolArguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        dependsOn: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        fallbackAction: z.ZodOptional<z.ZodString>;
        estimatedConfidence: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        stepId: number;
        actionType: "tool_call" | "reasoning" | "memory_lookup" | "response";
        dependsOn: number[];
        estimatedConfidence: number;
        toolName?: string | undefined;
        toolArguments?: Record<string, unknown> | undefined;
        fallbackAction?: string | undefined;
    }, {
        description: string;
        stepId: number;
        toolName?: string | undefined;
        actionType?: "tool_call" | "reasoning" | "memory_lookup" | "response" | undefined;
        toolArguments?: Record<string, unknown> | undefined;
        dependsOn?: number[] | undefined;
        fallbackAction?: string | undefined;
        estimatedConfidence?: number | undefined;
    }>, "many">;
    estimatedTotalConfidence: z.ZodNumber;
    parallelGroups: z.ZodDefault<z.ZodArray<z.ZodArray<z.ZodNumber, "many">, "many">>;
    rollbackStrategy: z.ZodOptional<z.ZodString>;
    estimatedCostUsd: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    steps: {
        description: string;
        stepId: number;
        actionType: "tool_call" | "reasoning" | "memory_lookup" | "response";
        dependsOn: number[];
        estimatedConfidence: number;
        toolName?: string | undefined;
        toolArguments?: Record<string, unknown> | undefined;
        fallbackAction?: string | undefined;
    }[];
    goal: string;
    estimatedTotalConfidence: number;
    parallelGroups: number[][];
    rollbackStrategy?: string | undefined;
    estimatedCostUsd?: number | undefined;
}, {
    steps: {
        description: string;
        stepId: number;
        toolName?: string | undefined;
        actionType?: "tool_call" | "reasoning" | "memory_lookup" | "response" | undefined;
        toolArguments?: Record<string, unknown> | undefined;
        dependsOn?: number[] | undefined;
        fallbackAction?: string | undefined;
        estimatedConfidence?: number | undefined;
    }[];
    goal: string;
    estimatedTotalConfidence: number;
    parallelGroups?: number[][] | undefined;
    rollbackStrategy?: string | undefined;
    estimatedCostUsd?: number | undefined;
}>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export declare const StepResultSchema: z.ZodObject<{
    stepId: z.ZodNumber;
    success: z.ZodBoolean;
    data: z.ZodUnknown;
    error: z.ZodOptional<z.ZodString>;
    durationMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    stepId: number;
    data?: unknown;
    error?: string | undefined;
    durationMs?: number | undefined;
}, {
    success: boolean;
    stepId: number;
    data?: unknown;
    error?: string | undefined;
    durationMs?: number | undefined;
}>;
export type StepResult = z.infer<typeof StepResultSchema>;
export declare const ExecutionResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    stepResults: z.ZodArray<z.ZodObject<{
        stepId: z.ZodNumber;
        success: z.ZodBoolean;
        data: z.ZodUnknown;
        error: z.ZodOptional<z.ZodString>;
        durationMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        success: boolean;
        stepId: number;
        data?: unknown;
        error?: string | undefined;
        durationMs?: number | undefined;
    }, {
        success: boolean;
        stepId: number;
        data?: unknown;
        error?: string | undefined;
        durationMs?: number | undefined;
    }>, "many">;
    finalResult: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    stepResults: {
        success: boolean;
        stepId: number;
        data?: unknown;
        error?: string | undefined;
        durationMs?: number | undefined;
    }[];
    finalResult?: unknown;
}, {
    success: boolean;
    stepResults: {
        success: boolean;
        stepId: number;
        data?: unknown;
        error?: string | undefined;
        durationMs?: number | undefined;
    }[];
    finalResult?: unknown;
}>;
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;
export declare const BehaviorParametersSchema: z.ZodObject<{
    reasoningDepth: z.ZodDefault<z.ZodNumber>;
    explorationVsExploitation: z.ZodDefault<z.ZodNumber>;
    verbosityLevel: z.ZodDefault<z.ZodNumber>;
    confidenceThreshold: z.ZodDefault<z.ZodNumber>;
    toolUsePreference: z.ZodDefault<z.ZodNumber>;
    creativityLevel: z.ZodDefault<z.ZodNumber>;
    proactiveSuggestion: z.ZodDefault<z.ZodBoolean>;
    selfReflectionFrequency: z.ZodDefault<z.ZodNumber>;
    maxPlanSteps: z.ZodDefault<z.ZodNumber>;
    memoryRetrievalBreadth: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reasoningDepth: number;
    explorationVsExploitation: number;
    verbosityLevel: number;
    confidenceThreshold: number;
    toolUsePreference: number;
    creativityLevel: number;
    proactiveSuggestion: boolean;
    selfReflectionFrequency: number;
    maxPlanSteps: number;
    memoryRetrievalBreadth: number;
}, {
    reasoningDepth?: number | undefined;
    explorationVsExploitation?: number | undefined;
    verbosityLevel?: number | undefined;
    confidenceThreshold?: number | undefined;
    toolUsePreference?: number | undefined;
    creativityLevel?: number | undefined;
    proactiveSuggestion?: boolean | undefined;
    selfReflectionFrequency?: number | undefined;
    maxPlanSteps?: number | undefined;
    memoryRetrievalBreadth?: number | undefined;
}>;
export type BehaviorParameters = z.infer<typeof BehaviorParametersSchema>;
export declare const CallerAdaptationSchema: z.ZodObject<{
    responseStyle: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    reasoningAdjustments: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    preferences: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    responseStyle: Record<string, unknown>;
    reasoningAdjustments: Record<string, unknown>;
    preferences: Record<string, unknown>;
}, {
    responseStyle?: Record<string, unknown> | undefined;
    reasoningAdjustments?: Record<string, unknown> | undefined;
    preferences?: Record<string, unknown> | undefined;
}>;
export type CallerAdaptation = z.infer<typeof CallerAdaptationSchema>;
export interface IStemAgent {
    /** Process a message through the full pipeline. */
    process(taskId: string, message: import("./message.js").AgentMessage, principal?: import("./security.js").Principal | null): Promise<import("./message.js").AgentResponse>;
    /** Stream a response for a task. */
    stream(taskId: string, message: import("./message.js").AgentMessage): AsyncIterable<import("./message.js").AgentResponse>;
    /** Initialize the agent (connect MCP, load memory). */
    initialize(): Promise<void>;
    /** Graceful shutdown. */
    shutdown(): Promise<void>;
    /** Get the agent card. */
    getAgentCard(): import("./agent-card.js").AgentCard;
}
//# sourceMappingURL=agent-core.d.ts.map