"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListTasksQuerySchema = exports.CreateTaskSchema = void 0;
const zod_1 = require("zod");
/** Request body for POST /api/v1/tasks and POST /api/v1/chat. */
exports.CreateTaskSchema = zod_1.z.object({
    message: zod_1.z.unknown(),
    contentType: zod_1.z.string().default("text/plain"),
    callerId: zod_1.z.string().optional(),
    sessionId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
/** Query params for GET /api/v1/tasks. */
exports.ListTasksQuerySchema = zod_1.z.object({
    status: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
//# sourceMappingURL=validation.js.map