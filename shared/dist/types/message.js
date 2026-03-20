import { z } from "zod";
// ---------------------------------------------------------------------------
// Universal Message Format (from design doc Sec 2.3)
// ---------------------------------------------------------------------------
export const AgentMessageSchema = z.object({
    id: z.string().uuid(),
    role: z.enum(["user", "agent", "system", "tool"]).default("user"),
    content: z.unknown(),
    contentType: z.string().default("text/plain"),
    metadata: z.record(z.unknown()).default({}),
    callerId: z.string().optional(),
    sessionId: z.string().optional(),
    timestamp: z.number().default(() => Date.now()),
    callerContext: z.record(z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// Agent Response
// ---------------------------------------------------------------------------
export const TaskStatus = z.enum([
    "pending",
    "in_progress",
    "completed",
    "failed",
    "cancelled",
]);
export const ArtifactSchema = z.object({
    name: z.string(),
    mimeType: z.string().default("application/octet-stream"),
    data: z.unknown(),
    metadata: z.record(z.unknown()).default({}),
});
export const AgentResponseSchema = z.object({
    id: z.string().uuid(),
    status: TaskStatus.default("completed"),
    content: z.unknown().optional(),
    contentType: z.string().default("text/plain"),
    artifacts: z.array(ArtifactSchema).default([]),
    metadata: z.record(z.unknown()).default({}),
    reasoningTrace: z.array(z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Inter-Agent Message (from design doc Sec 2.5.1)
// ---------------------------------------------------------------------------
export const InterAgentMessageSchema = z.object({
    id: z.string().uuid(),
    senderId: z.string(),
    recipientId: z.string().default(""), // empty = broadcast
    messageType: z
        .enum(["task", "result", "status", "vote", "cancel"])
        .default("task"),
    payload: z.record(z.unknown()).default({}),
    correlationId: z.string().optional(),
    timestamp: z.number().default(() => Date.now()),
    ttlSeconds: z.number().int().default(300),
});
//# sourceMappingURL=message.js.map