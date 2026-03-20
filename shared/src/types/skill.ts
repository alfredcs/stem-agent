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
export type SkillMaturity = z.infer<typeof SkillMaturity>;

/** How the skill was acquired. */
export const SkillSource = z.enum([
  "crystallized",   // auto-learned from episode patterns
  "plugin",         // manually registered by user/config
]);
export type SkillSource = z.infer<typeof SkillSource>;

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

export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;

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

export type Skill = z.infer<typeof SkillSchema>;

// ---------------------------------------------------------------------------
// Skill Registry Interface
// ---------------------------------------------------------------------------

export interface ISkillRegistry {
  /** Register a skill (manual plugin or crystallized). */
  register(skill: Skill): Promise<void>;

  /** Remove a skill by ID. */
  deregister(skillId: string): Promise<void>;

  /** Find skills matching a perception context. */
  match(intent: string, domain?: string, entityTypes?: string[]): Promise<Skill[]>;

  /** Get a skill by ID. */
  get(skillId: string): Promise<Skill | null>;

  /** Get a skill by name. */
  getByName(name: string): Promise<Skill | null>;

  /** List all registered skills. */
  listAll(): Promise<Skill[]>;

  /** Record activation outcome (updates maturity + success rate). */
  recordOutcome(skillId: string, success: boolean): Promise<void>;
}
