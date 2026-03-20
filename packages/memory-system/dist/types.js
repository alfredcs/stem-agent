import { z } from "zod";
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export const MemorySystemConfigSchema = z.object({
    /** Embedding dimensions (must match provider). */
    embeddingDimensions: z.number().int().positive().default(1536),
    /** Number of interactions between consolidation runs. */
    consolidationInterval: z.number().int().positive().default(10),
    /** Days after which episodic memories are auto-summarized. */
    autoSummarizeDays: z.number().positive().default(7),
    /** Default limit for similarity search results. */
    defaultSearchLimit: z.number().int().positive().default(10),
    /** Success rate threshold below which procedures are deprecated. */
    procedureDeprecationThreshold: z.number().min(0).max(1).default(0.2),
    /** Minimum executions before a procedure can be deprecated. */
    procedureMinExecutions: z.number().int().positive().default(5),
    /** EMA learning rate for caller profile updates. */
    profileLearningRate: z.number().min(0).max(1).default(0.1),
});
//# sourceMappingURL=types.js.map