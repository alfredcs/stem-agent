import { z } from "zod";
/** Request body for POST /api/v1/tasks and POST /api/v1/chat. */
export declare const CreateTaskSchema: z.ZodObject<{
    message: z.ZodUnknown;
    contentType: z.ZodDefault<z.ZodString>;
    callerId: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    contentType: string;
    metadata: Record<string, unknown>;
    message?: unknown;
    callerId?: string | undefined;
    sessionId?: string | undefined;
}, {
    contentType?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    message?: unknown;
    callerId?: string | undefined;
    sessionId?: string | undefined;
}>;
export type CreateTaskBody = z.infer<typeof CreateTaskSchema>;
/** Query params for GET /api/v1/tasks. */
export declare const ListTasksQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    status?: string | undefined;
}, {
    status?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;
//# sourceMappingURL=validation.d.ts.map