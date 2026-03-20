import { z } from "zod";
/** AG-UI event type discriminator. */
export declare const AGUIEventType: {
    readonly RUN_STARTED: "RUN_STARTED";
    readonly RUN_FINISHED: "RUN_FINISHED";
    readonly RUN_ERROR: "RUN_ERROR";
    readonly STEP_STARTED: "STEP_STARTED";
    readonly STEP_FINISHED: "STEP_FINISHED";
    readonly TEXT_MESSAGE_START: "TEXT_MESSAGE_START";
    readonly TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT";
    readonly TEXT_MESSAGE_END: "TEXT_MESSAGE_END";
    readonly TOOL_CALL_START: "TOOL_CALL_START";
    readonly TOOL_CALL_ARGS: "TOOL_CALL_ARGS";
    readonly TOOL_CALL_END: "TOOL_CALL_END";
    readonly TOOL_CALL_RESULT: "TOOL_CALL_RESULT";
    readonly STATE_SNAPSHOT: "STATE_SNAPSHOT";
    readonly STATE_DELTA: "STATE_DELTA";
    readonly REASONING_START: "REASONING_START";
    readonly REASONING_MESSAGE_START: "REASONING_MESSAGE_START";
    readonly REASONING_MESSAGE_CONTENT: "REASONING_MESSAGE_CONTENT";
    readonly REASONING_MESSAGE_END: "REASONING_MESSAGE_END";
    readonly REASONING_END: "REASONING_END";
    readonly CUSTOM: "CUSTOM";
};
export type AGUIEventType = (typeof AGUIEventType)[keyof typeof AGUIEventType];
export declare const AGUIBaseEventSchema: z.ZodObject<{
    type: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: string;
    timestamp?: number | undefined;
}, {
    type: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIRunStartedSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_STARTED">;
    threadId: z.ZodString;
    runId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "RUN_STARTED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
}, {
    type: "RUN_STARTED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIRunFinishedSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_FINISHED">;
    threadId: z.ZodString;
    runId: z.ZodString;
    result: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "RUN_FINISHED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
    result?: unknown;
}, {
    type: "RUN_FINISHED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
    result?: unknown;
}>;
export declare const AGUIRunErrorSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_ERROR">;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "RUN_ERROR";
    code?: string | undefined;
    timestamp?: number | undefined;
}, {
    message: string;
    type: "RUN_ERROR";
    code?: string | undefined;
    timestamp?: number | undefined;
}>;
export declare const AGUIStepStartedSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STEP_STARTED">;
    stepName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "STEP_STARTED";
    stepName: string;
    timestamp?: number | undefined;
}, {
    type: "STEP_STARTED";
    stepName: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIStepFinishedSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STEP_FINISHED">;
    stepName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "STEP_FINISHED";
    stepName: string;
    timestamp?: number | undefined;
}, {
    type: "STEP_FINISHED";
    stepName: string;
    timestamp?: number | undefined;
}>;
export declare const AGUITextMessageStartSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_START">;
    messageId: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["assistant", "user", "system", "developer", "tool"]>>;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_START";
    messageId: string;
    role: "assistant" | "user" | "system" | "developer" | "tool";
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_START";
    messageId: string;
    timestamp?: number | undefined;
    role?: "assistant" | "user" | "system" | "developer" | "tool" | undefined;
}>;
export declare const AGUITextMessageContentSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_CONTENT">;
    messageId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}>;
export declare const AGUITextMessageEndSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIToolCallStartSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_START">;
    toolCallId: z.ZodString;
    toolCallName: z.ZodString;
    parentMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_START";
    toolCallId: string;
    toolCallName: string;
    timestamp?: number | undefined;
    parentMessageId?: string | undefined;
}, {
    type: "TOOL_CALL_START";
    toolCallId: string;
    toolCallName: string;
    timestamp?: number | undefined;
    parentMessageId?: string | undefined;
}>;
export declare const AGUIToolCallArgsSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_ARGS">;
    toolCallId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_ARGS";
    delta: string;
    toolCallId: string;
    timestamp?: number | undefined;
}, {
    type: "TOOL_CALL_ARGS";
    delta: string;
    toolCallId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIToolCallEndSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_END">;
    toolCallId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_END";
    toolCallId: string;
    timestamp?: number | undefined;
}, {
    type: "TOOL_CALL_END";
    toolCallId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIToolCallResultSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_RESULT">;
    messageId: z.ZodString;
    toolCallId: z.ZodString;
    content: z.ZodUnknown;
    role: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_RESULT";
    messageId: string;
    role: string;
    toolCallId: string;
    timestamp?: number | undefined;
    content?: unknown;
}, {
    type: "TOOL_CALL_RESULT";
    messageId: string;
    toolCallId: string;
    timestamp?: number | undefined;
    role?: string | undefined;
    content?: unknown;
}>;
export declare const AGUIStateSnapshotSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STATE_SNAPSHOT">;
    snapshot: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "STATE_SNAPSHOT";
    snapshot: Record<string, unknown>;
    timestamp?: number | undefined;
}, {
    type: "STATE_SNAPSHOT";
    snapshot: Record<string, unknown>;
    timestamp?: number | undefined;
}>;
export declare const AGUIStateDeltaSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STATE_DELTA">;
    delta: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "STATE_DELTA";
    delta: Record<string, unknown>[];
    timestamp?: number | undefined;
}, {
    type: "STATE_DELTA";
    delta: Record<string, unknown>[];
    timestamp?: number | undefined;
}>;
export declare const AGUIReasoningStartSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_START">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_START";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_START";
    messageId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIReasoningMessageStartSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_START">;
    messageId: z.ZodString;
    role: z.ZodLiteral<"assistant">;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_START";
    messageId: string;
    role: "assistant";
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_START";
    messageId: string;
    role: "assistant";
    timestamp?: number | undefined;
}>;
export declare const AGUIReasoningMessageContentSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_CONTENT">;
    messageId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIReasoningMessageEndSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUIReasoningEndSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_END";
    messageId: string;
    timestamp?: number | undefined;
}>;
export declare const AGUICustomEventSchema: z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"CUSTOM">;
    name: z.ZodString;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "CUSTOM";
    name: string;
    value?: unknown;
    timestamp?: number | undefined;
}, {
    type: "CUSTOM";
    name: string;
    value?: unknown;
    timestamp?: number | undefined;
}>;
export declare const AGUIEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_STARTED">;
    threadId: z.ZodString;
    runId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "RUN_STARTED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
}, {
    type: "RUN_STARTED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_FINISHED">;
    threadId: z.ZodString;
    runId: z.ZodString;
    result: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "RUN_FINISHED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
    result?: unknown;
}, {
    type: "RUN_FINISHED";
    threadId: string;
    runId: string;
    timestamp?: number | undefined;
    result?: unknown;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"RUN_ERROR">;
    message: z.ZodString;
    code: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "RUN_ERROR";
    code?: string | undefined;
    timestamp?: number | undefined;
}, {
    message: string;
    type: "RUN_ERROR";
    code?: string | undefined;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STEP_STARTED">;
    stepName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "STEP_STARTED";
    stepName: string;
    timestamp?: number | undefined;
}, {
    type: "STEP_STARTED";
    stepName: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STEP_FINISHED">;
    stepName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "STEP_FINISHED";
    stepName: string;
    timestamp?: number | undefined;
}, {
    type: "STEP_FINISHED";
    stepName: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_START">;
    messageId: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["assistant", "user", "system", "developer", "tool"]>>;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_START";
    messageId: string;
    role: "assistant" | "user" | "system" | "developer" | "tool";
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_START";
    messageId: string;
    timestamp?: number | undefined;
    role?: "assistant" | "user" | "system" | "developer" | "tool" | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_CONTENT">;
    messageId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TEXT_MESSAGE_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TEXT_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "TEXT_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_START">;
    toolCallId: z.ZodString;
    toolCallName: z.ZodString;
    parentMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_START";
    toolCallId: string;
    toolCallName: string;
    timestamp?: number | undefined;
    parentMessageId?: string | undefined;
}, {
    type: "TOOL_CALL_START";
    toolCallId: string;
    toolCallName: string;
    timestamp?: number | undefined;
    parentMessageId?: string | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_ARGS">;
    toolCallId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_ARGS";
    delta: string;
    toolCallId: string;
    timestamp?: number | undefined;
}, {
    type: "TOOL_CALL_ARGS";
    delta: string;
    toolCallId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_END">;
    toolCallId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_END";
    toolCallId: string;
    timestamp?: number | undefined;
}, {
    type: "TOOL_CALL_END";
    toolCallId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"TOOL_CALL_RESULT">;
    messageId: z.ZodString;
    toolCallId: z.ZodString;
    content: z.ZodUnknown;
    role: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "TOOL_CALL_RESULT";
    messageId: string;
    role: string;
    toolCallId: string;
    timestamp?: number | undefined;
    content?: unknown;
}, {
    type: "TOOL_CALL_RESULT";
    messageId: string;
    toolCallId: string;
    timestamp?: number | undefined;
    role?: string | undefined;
    content?: unknown;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STATE_SNAPSHOT">;
    snapshot: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "STATE_SNAPSHOT";
    snapshot: Record<string, unknown>;
    timestamp?: number | undefined;
}, {
    type: "STATE_SNAPSHOT";
    snapshot: Record<string, unknown>;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"STATE_DELTA">;
    delta: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "STATE_DELTA";
    delta: Record<string, unknown>[];
    timestamp?: number | undefined;
}, {
    type: "STATE_DELTA";
    delta: Record<string, unknown>[];
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_START">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_START";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_START";
    messageId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_START">;
    messageId: z.ZodString;
    role: z.ZodLiteral<"assistant">;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_START";
    messageId: string;
    role: "assistant";
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_START";
    messageId: string;
    role: "assistant";
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_CONTENT">;
    messageId: z.ZodString;
    delta: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_CONTENT";
    messageId: string;
    delta: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_MESSAGE_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_MESSAGE_END";
    messageId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"REASONING_END">;
    messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "REASONING_END";
    messageId: string;
    timestamp?: number | undefined;
}, {
    type: "REASONING_END";
    messageId: string;
    timestamp?: number | undefined;
}>, z.ZodObject<{
    timestamp: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodLiteral<"CUSTOM">;
    name: z.ZodString;
    value: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "CUSTOM";
    name: string;
    value?: unknown;
    timestamp?: number | undefined;
}, {
    type: "CUSTOM";
    name: string;
    value?: unknown;
    timestamp?: number | undefined;
}>]>;
export type AGUIEvent = z.infer<typeof AGUIEventSchema>;
export declare const AGUIMessageSchema: z.ZodObject<{
    id: z.ZodString;
    role: z.ZodEnum<["user", "assistant", "system", "developer", "tool"]>;
    content: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "assistant" | "user" | "system" | "developer" | "tool";
    content?: unknown;
}, {
    id: string;
    role: "assistant" | "user" | "system" | "developer" | "tool";
    content?: unknown;
}>;
export type AGUIMessage = z.infer<typeof AGUIMessageSchema>;
export declare const AGUIToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}, {
    name: string;
    description?: string | undefined;
    parameters?: Record<string, unknown> | undefined;
}>;
export declare const RunAgentInputSchema: z.ZodObject<{
    threadId: z.ZodString;
    runId: z.ZodString;
    messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        role: z.ZodEnum<["user", "assistant", "system", "developer", "tool"]>;
        content: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        id: string;
        role: "assistant" | "user" | "system" | "developer" | "tool";
        content?: unknown;
    }, {
        id: string;
        role: "assistant" | "user" | "system" | "developer" | "tool";
        content?: unknown;
    }>, "many">>;
    tools: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }, {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }>, "many">>;
    state: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    context: z.ZodDefault<z.ZodArray<z.ZodUnknown, "many">>;
    forwardedProps: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    threadId: string;
    runId: string;
    messages: {
        id: string;
        role: "assistant" | "user" | "system" | "developer" | "tool";
        content?: unknown;
    }[];
    tools: {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[];
    state: Record<string, unknown>;
    context: unknown[];
    forwardedProps: Record<string, unknown>;
}, {
    threadId: string;
    runId: string;
    messages?: {
        id: string;
        role: "assistant" | "user" | "system" | "developer" | "tool";
        content?: unknown;
    }[] | undefined;
    tools?: {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
    }[] | undefined;
    state?: Record<string, unknown> | undefined;
    context?: unknown[] | undefined;
    forwardedProps?: Record<string, unknown> | undefined;
}>;
export type RunAgentInput = z.infer<typeof RunAgentInputSchema>;
/** Simple input form: { message, threadId?, runId?, state? } */
export declare const AGUISimpleInputSchema: z.ZodObject<{
    message: z.ZodString;
    threadId: z.ZodOptional<z.ZodString>;
    runId: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    threadId?: string | undefined;
    runId?: string | undefined;
    state?: Record<string, unknown> | undefined;
}, {
    message: string;
    threadId?: string | undefined;
    runId?: string | undefined;
    state?: Record<string, unknown> | undefined;
}>;
export type AGUISimpleInput = z.infer<typeof AGUISimpleInputSchema>;
//# sourceMappingURL=ag-ui.d.ts.map