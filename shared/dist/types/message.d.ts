import { z } from "zod";
export declare const AgentMessageSchema: z.ZodObject<{
    id: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["user", "agent", "system", "tool"]>>;
    content: z.ZodUnknown;
    contentType: z.ZodDefault<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    callerId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    callerContext: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "user" | "agent" | "system" | "tool";
    contentType: string;
    metadata: Record<string, unknown>;
    timestamp: number;
    content?: unknown;
    callerId?: string | undefined;
    sessionId?: string | undefined;
    callerContext?: Record<string, unknown> | undefined;
}, {
    id: string;
    role?: "user" | "agent" | "system" | "tool" | undefined;
    content?: unknown;
    contentType?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    callerId?: string | undefined;
    sessionId?: string | undefined;
    timestamp?: number | undefined;
    callerContext?: Record<string, unknown> | undefined;
}>;
export type AgentMessage = z.infer<typeof AgentMessageSchema>;
export declare const TaskStatus: z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export declare const ArtifactSchema: z.ZodObject<{
    name: z.ZodString;
    mimeType: z.ZodDefault<z.ZodString>;
    data: z.ZodUnknown;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    metadata: Record<string, unknown>;
    mimeType: string;
    data?: unknown;
}, {
    name: string;
    metadata?: Record<string, unknown> | undefined;
    mimeType?: string | undefined;
    data?: unknown;
}>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export declare const AgentResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "failed", "cancelled"]>>;
    content: z.ZodOptional<z.ZodUnknown>;
    contentType: z.ZodDefault<z.ZodString>;
    artifacts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        mimeType: z.ZodDefault<z.ZodString>;
        data: z.ZodUnknown;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        metadata: Record<string, unknown>;
        mimeType: string;
        data?: unknown;
    }, {
        name: string;
        metadata?: Record<string, unknown> | undefined;
        mimeType?: string | undefined;
        data?: unknown;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    reasoningTrace: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    contentType: string;
    status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
    metadata: Record<string, unknown>;
    artifacts: {
        name: string;
        metadata: Record<string, unknown>;
        mimeType: string;
        data?: unknown;
    }[];
    content?: unknown;
    reasoningTrace?: string[] | undefined;
}, {
    id: string;
    content?: unknown;
    contentType?: string | undefined;
    status?: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | undefined;
    metadata?: Record<string, unknown> | undefined;
    artifacts?: {
        name: string;
        metadata?: Record<string, unknown> | undefined;
        mimeType?: string | undefined;
        data?: unknown;
    }[] | undefined;
    reasoningTrace?: string[] | undefined;
}>;
export type AgentResponse = z.infer<typeof AgentResponseSchema>;
export declare const InterAgentMessageSchema: z.ZodObject<{
    id: z.ZodString;
    senderId: z.ZodString;
    recipientId: z.ZodDefault<z.ZodString>;
    messageType: z.ZodDefault<z.ZodEnum<["task", "result", "status", "vote", "cancel"]>>;
    payload: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    correlationId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    ttlSeconds: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    timestamp: number;
    senderId: string;
    recipientId: string;
    messageType: "status" | "task" | "result" | "vote" | "cancel";
    payload: Record<string, unknown>;
    ttlSeconds: number;
    correlationId?: string | undefined;
}, {
    id: string;
    senderId: string;
    timestamp?: number | undefined;
    recipientId?: string | undefined;
    messageType?: "status" | "task" | "result" | "vote" | "cancel" | undefined;
    payload?: Record<string, unknown> | undefined;
    correlationId?: string | undefined;
    ttlSeconds?: number | undefined;
}>;
export type InterAgentMessage = z.infer<typeof InterAgentMessageSchema>;
//# sourceMappingURL=message.d.ts.map