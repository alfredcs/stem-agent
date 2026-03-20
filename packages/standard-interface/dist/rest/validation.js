import { z } from "zod";
/** Request body for POST /api/v1/tasks and POST /api/v1/chat. */
export const CreateTaskSchema = z.object({
    message: z.unknown(),
    contentType: z.string().default("text/plain"),
    callerId: z.string().optional(),
    sessionId: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
});
/** Query params for GET /api/v1/tasks. */
export const ListTasksQuerySchema = z.object({
    status: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
//# sourceMappingURL=validation.js.map