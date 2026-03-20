import { z } from "zod";

// ---------------------------------------------------------------------------
// AG-UI Protocol Types (Agent-User Interaction Protocol)
// Self-contained Zod schemas — no external SDK dependency.
// See: https://docs.ag-ui.com/concepts/events
// ---------------------------------------------------------------------------

/** AG-UI event type discriminator. */
export const AGUIEventType = {
  // Lifecycle
  RUN_STARTED: "RUN_STARTED",
  RUN_FINISHED: "RUN_FINISHED",
  RUN_ERROR: "RUN_ERROR",
  STEP_STARTED: "STEP_STARTED",
  STEP_FINISHED: "STEP_FINISHED",

  // Text messages
  TEXT_MESSAGE_START: "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT: "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END: "TEXT_MESSAGE_END",

  // Tool calls
  TOOL_CALL_START: "TOOL_CALL_START",
  TOOL_CALL_ARGS: "TOOL_CALL_ARGS",
  TOOL_CALL_END: "TOOL_CALL_END",
  TOOL_CALL_RESULT: "TOOL_CALL_RESULT",

  // State
  STATE_SNAPSHOT: "STATE_SNAPSHOT",
  STATE_DELTA: "STATE_DELTA",

  // Reasoning
  REASONING_START: "REASONING_START",
  REASONING_MESSAGE_START: "REASONING_MESSAGE_START",
  REASONING_MESSAGE_CONTENT: "REASONING_MESSAGE_CONTENT",
  REASONING_MESSAGE_END: "REASONING_MESSAGE_END",
  REASONING_END: "REASONING_END",

  // Special
  CUSTOM: "CUSTOM",
} as const;

export type AGUIEventType = (typeof AGUIEventType)[keyof typeof AGUIEventType];

// ---------------------------------------------------------------------------
// Base event shape shared by all AG-UI events
// ---------------------------------------------------------------------------

export const AGUIBaseEventSchema = z.object({
  type: z.string(),
  timestamp: z.number().optional(),
});

// ---------------------------------------------------------------------------
// Lifecycle events
// ---------------------------------------------------------------------------

export const AGUIRunStartedSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.RUN_STARTED),
  threadId: z.string(),
  runId: z.string(),
});

export const AGUIRunFinishedSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.RUN_FINISHED),
  threadId: z.string(),
  runId: z.string(),
  result: z.unknown().optional(),
});

export const AGUIRunErrorSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.RUN_ERROR),
  message: z.string(),
  code: z.string().optional(),
});

export const AGUIStepStartedSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.STEP_STARTED),
  stepName: z.string(),
});

export const AGUIStepFinishedSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.STEP_FINISHED),
  stepName: z.string(),
});

// ---------------------------------------------------------------------------
// Text message events
// ---------------------------------------------------------------------------

export const AGUITextMessageStartSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TEXT_MESSAGE_START),
  messageId: z.string(),
  role: z.enum(["assistant", "user", "system", "developer", "tool"]).default("assistant"),
});

export const AGUITextMessageContentSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TEXT_MESSAGE_CONTENT),
  messageId: z.string(),
  delta: z.string(),
});

export const AGUITextMessageEndSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TEXT_MESSAGE_END),
  messageId: z.string(),
});

// ---------------------------------------------------------------------------
// Tool call events
// ---------------------------------------------------------------------------

export const AGUIToolCallStartSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TOOL_CALL_START),
  toolCallId: z.string(),
  toolCallName: z.string(),
  parentMessageId: z.string().optional(),
});

export const AGUIToolCallArgsSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TOOL_CALL_ARGS),
  toolCallId: z.string(),
  delta: z.string(),
});

export const AGUIToolCallEndSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TOOL_CALL_END),
  toolCallId: z.string(),
});

export const AGUIToolCallResultSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.TOOL_CALL_RESULT),
  messageId: z.string(),
  toolCallId: z.string(),
  content: z.unknown(),
  role: z.string().default("tool"),
});

// ---------------------------------------------------------------------------
// State events
// ---------------------------------------------------------------------------

export const AGUIStateSnapshotSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.STATE_SNAPSHOT),
  snapshot: z.record(z.unknown()),
});

export const AGUIStateDeltaSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.STATE_DELTA),
  delta: z.array(z.record(z.unknown())),
});

// ---------------------------------------------------------------------------
// Reasoning events
// ---------------------------------------------------------------------------

export const AGUIReasoningStartSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.REASONING_START),
  messageId: z.string(),
});

export const AGUIReasoningMessageStartSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.REASONING_MESSAGE_START),
  messageId: z.string(),
  role: z.literal("assistant"),
});

export const AGUIReasoningMessageContentSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.REASONING_MESSAGE_CONTENT),
  messageId: z.string(),
  delta: z.string(),
});

export const AGUIReasoningMessageEndSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.REASONING_MESSAGE_END),
  messageId: z.string(),
});

export const AGUIReasoningEndSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.REASONING_END),
  messageId: z.string(),
});

// ---------------------------------------------------------------------------
// Custom event
// ---------------------------------------------------------------------------

export const AGUICustomEventSchema = AGUIBaseEventSchema.extend({
  type: z.literal(AGUIEventType.CUSTOM),
  name: z.string(),
  value: z.unknown(),
});

// ---------------------------------------------------------------------------
// Union of all AG-UI events
// ---------------------------------------------------------------------------

export const AGUIEventSchema = z.discriminatedUnion("type", [
  AGUIRunStartedSchema,
  AGUIRunFinishedSchema,
  AGUIRunErrorSchema,
  AGUIStepStartedSchema,
  AGUIStepFinishedSchema,
  AGUITextMessageStartSchema,
  AGUITextMessageContentSchema,
  AGUITextMessageEndSchema,
  AGUIToolCallStartSchema,
  AGUIToolCallArgsSchema,
  AGUIToolCallEndSchema,
  AGUIToolCallResultSchema,
  AGUIStateSnapshotSchema,
  AGUIStateDeltaSchema,
  AGUIReasoningStartSchema,
  AGUIReasoningMessageStartSchema,
  AGUIReasoningMessageContentSchema,
  AGUIReasoningMessageEndSchema,
  AGUIReasoningEndSchema,
  AGUICustomEventSchema,
]);

export type AGUIEvent = z.infer<typeof AGUIEventSchema>;

// ---------------------------------------------------------------------------
// RunAgentInput — the POST body for the AG-UI endpoint
// Accepts either full RunAgentInput or simple { message, threadId?, runId? }
// ---------------------------------------------------------------------------

export const AGUIMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "developer", "tool"]),
  content: z.unknown(),
});

export type AGUIMessage = z.infer<typeof AGUIMessageSchema>;

export const AGUIToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  parameters: z.record(z.unknown()).optional(),
});

export const RunAgentInputSchema = z.object({
  threadId: z.string(),
  runId: z.string(),
  messages: z.array(AGUIMessageSchema).default([]),
  tools: z.array(AGUIToolSchema).default([]),
  state: z.record(z.unknown()).default({}),
  context: z.array(z.unknown()).default([]),
  forwardedProps: z.record(z.unknown()).default({}),
});

export type RunAgentInput = z.infer<typeof RunAgentInputSchema>;

/** Simple input form: { message, threadId?, runId?, state? } */
export const AGUISimpleInputSchema = z.object({
  message: z.string(),
  threadId: z.string().optional(),
  runId: z.string().optional(),
  state: z.record(z.unknown()).optional(),
});

export type AGUISimpleInput = z.infer<typeof AGUISimpleInputSchema>;
