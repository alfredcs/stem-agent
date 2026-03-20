import { z } from "zod";
// ---------------------------------------------------------------------------
// Skills Acquisition Types (Cell Differentiation Model)
// ---------------------------------------------------------------------------
/**
 * Skill maturity mirrors cell differentiation stages:
 * - progenitor: newly detected pattern, not yet reliable
 * - committed: pattern confirmed across multiple episodes, usable
 * - mature: well-tested skill with high success rate, preferred
 */
export const SkillMaturity = z.enum(["progenitor", "committed", "mature"]);
/** How the skill was acquired. */
export const SkillSource = z.enum([
    "crystallized", // auto-learned from episode patterns
    "plugin", // manually registered by user/config
]);
/** Activation trigger — conditions under which a skill fires. */
export const SkillTriggerSchema = z.object({
    /** Intent patterns (regex or exact match). */
    intentPatterns: z.array(z.string()).default([]),
    /** Domain keywords that activate this skill. */
    domains: z.array(z.string()).default([]),
    /** Entity types this skill handles. */
    entityTypes: z.array(z.string()).default([]),
    /** Minimum complexity level required. */
    minComplexity: z.enum(["simple", "medium", "complex"]).optional(),
});
/** A crystallized agent skill. */
export const SkillSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    /** The tool sequence or action chain this skill encapsulates. */
    toolChain: z.array(z.object({
        toolName: z.string(),
        argumentTemplate: z.record(z.unknown()).default({}),
    })).default([]),
    /** Free-form procedure steps for non-tool skills. */
    steps: z.array(z.string()).default([]),
    trigger: SkillTriggerSchema,
    maturity: SkillMaturity.default("progenitor"),
    source: SkillSource.default("crystallized"),
    /** Number of times this skill has been activated. */
    activationCount: z.number().int().default(0),
    /** Running success rate (0-1). */
    successRate: z.number().min(0).max(1).default(0),
    /** Embedding for semantic matching. */
    embedding: z.array(z.number()).optional(),
    /** Tags for search. */
    tags: z.array(z.string()).default([]),
    createdAt: z.number().default(() => Date.now()),
    updatedAt: z.number().default(() => Date.now()),
});
//# sourceMappingURL=skill.js.map