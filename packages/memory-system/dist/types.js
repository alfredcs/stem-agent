"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySystemConfigSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
exports.MemorySystemConfigSchema = zod_1.z.object({
    /** Embedding dimensions (must match provider). */
    embeddingDimensions: zod_1.z.number().int().positive().default(1536),
    /** Number of interactions between consolidation runs. */
    consolidationInterval: zod_1.z.number().int().positive().default(10),
    /** Days after which episodic memories are auto-summarized. */
    autoSummarizeDays: zod_1.z.number().positive().default(7),
    /** Default limit for similarity search results. */
    defaultSearchLimit: zod_1.z.number().int().positive().default(10),
    /** Success rate threshold below which procedures are deprecated. */
    procedureDeprecationThreshold: zod_1.z.number().min(0).max(1).default(0.2),
    /** Minimum executions before a procedure can be deprecated. */
    procedureMinExecutions: zod_1.z.number().int().positive().default(5),
    /** EMA learning rate for caller profile updates. */
    profileLearningRate: zod_1.z.number().min(0).max(1).default(0.1),
});
//# sourceMappingURL=types.js.map