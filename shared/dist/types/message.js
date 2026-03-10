"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterAgentMessageSchema = exports.AgentResponseSchema = exports.ArtifactSchema = exports.TaskStatus = exports.AgentMessageSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Universal Message Format (from design doc Sec 2.3)
// ---------------------------------------------------------------------------
exports.AgentMessageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    role: zod_1.z.enum(["user", "agent", "system", "tool"]).default("user"),
    content: zod_1.z.unknown(),
    contentType: zod_1.z.string().default("text/plain"),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
    callerId: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    timestamp: zod_1.z.number().default(() => Date.now()),
    callerContext: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ---------------------------------------------------------------------------
// Agent Response
// ---------------------------------------------------------------------------
exports.TaskStatus = zod_1.z.enum([
    "pending",
    "in_progress",
    "completed",
    "failed",
    "cancelled",
]);
exports.ArtifactSchema = zod_1.z.object({
    name: zod_1.z.string(),
    mimeType: zod_1.z.string().default("application/octet-stream"),
    data: zod_1.z.unknown(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.AgentResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    status: exports.TaskStatus.default("completed"),
    content: zod_1.z.unknown().optional(),
    contentType: zod_1.z.string().default("text/plain"),
    artifacts: zod_1.z.array(exports.ArtifactSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
    reasoningTrace: zod_1.z.array(zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Inter-Agent Message (from design doc Sec 2.5.1)
// ---------------------------------------------------------------------------
exports.InterAgentMessageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    senderId: zod_1.z.string(),
    recipientId: zod_1.z.string().default(""), // empty = broadcast
    messageType: zod_1.z
        .enum(["task", "result", "status", "vote", "cancel"])
        .default("task"),
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
    correlationId: zod_1.z.string().optional(),
    timestamp: zod_1.z.number().default(() => Date.now()),
    ttlSeconds: zod_1.z.number().int().default(300),
});
//# sourceMappingURL=message.js.map