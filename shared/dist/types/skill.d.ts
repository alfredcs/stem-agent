import { z } from "zod";
/**
 * Skill maturity mirrors cell differentiation stages:
 * - progenitor: newly detected pattern, not yet reliable
 * - committed: pattern confirmed across multiple episodes, usable
 * - mature: well-tested skill with high success rate, preferred
 */
export declare const SkillMaturity: z.ZodEnum<["progenitor", "committed", "mature"]>;
export type SkillMaturity = z.infer<typeof SkillMaturity>;
/** How the skill was acquired. */
export declare const SkillSource: z.ZodEnum<["crystallized", "plugin"]>;
export type SkillSource = z.infer<typeof SkillSource>;
/** Activation trigger — conditions under which a skill fires. */
export declare const SkillTriggerSchema: z.ZodObject<{
    /** Intent patterns (regex or exact match). */
    intentPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Domain keywords that activate this skill. */
    domains: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Entity types this skill handles. */
    entityTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Minimum complexity level required. */
    minComplexity: z.ZodOptional<z.ZodEnum<["simple", "medium", "complex"]>>;
}, "strip", z.ZodTypeAny, {
    intentPatterns: string[];
    domains: string[];
    entityTypes: string[];
    minComplexity?: "simple" | "medium" | "complex" | undefined;
}, {
    intentPatterns?: string[] | undefined;
    domains?: string[] | undefined;
    entityTypes?: string[] | undefined;
    minComplexity?: "simple" | "medium" | "complex" | undefined;
}>;
export type SkillTrigger = z.infer<typeof SkillTriggerSchema>;
/** A crystallized agent skill. */
export declare const SkillSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    /** The tool sequence or action chain this skill encapsulates. */
    toolChain: z.ZodDefault<z.ZodArray<z.ZodObject<{
        toolName: z.ZodString;
        argumentTemplate: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        toolName: string;
        argumentTemplate: Record<string, unknown>;
    }, {
        toolName: string;
        argumentTemplate?: Record<string, unknown> | undefined;
    }>, "many">>;
    /** Free-form procedure steps for non-tool skills. */
    steps: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    trigger: z.ZodObject<{
        /** Intent patterns (regex or exact match). */
        intentPatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Domain keywords that activate this skill. */
        domains: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Entity types this skill handles. */
        entityTypes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Minimum complexity level required. */
        minComplexity: z.ZodOptional<z.ZodEnum<["simple", "medium", "complex"]>>;
    }, "strip", z.ZodTypeAny, {
        intentPatterns: string[];
        domains: string[];
        entityTypes: string[];
        minComplexity?: "simple" | "medium" | "complex" | undefined;
    }, {
        intentPatterns?: string[] | undefined;
        domains?: string[] | undefined;
        entityTypes?: string[] | undefined;
        minComplexity?: "simple" | "medium" | "complex" | undefined;
    }>;
    maturity: z.ZodDefault<z.ZodEnum<["progenitor", "committed", "mature"]>>;
    source: z.ZodDefault<z.ZodEnum<["crystallized", "plugin"]>>;
    /** Number of times this skill has been activated. */
    activationCount: z.ZodDefault<z.ZodNumber>;
    /** Running success rate (0-1). */
    successRate: z.ZodDefault<z.ZodNumber>;
    /** Embedding for semantic matching. */
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    /** Tags for search. */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDefault<z.ZodNumber>;
    updatedAt: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    description: string;
    tags: string[];
    source: "crystallized" | "plugin";
    createdAt: number;
    updatedAt: number;
    steps: string[];
    successRate: number;
    toolChain: {
        toolName: string;
        argumentTemplate: Record<string, unknown>;
    }[];
    trigger: {
        intentPatterns: string[];
        domains: string[];
        entityTypes: string[];
        minComplexity?: "simple" | "medium" | "complex" | undefined;
    };
    maturity: "progenitor" | "committed" | "mature";
    activationCount: number;
    embedding?: number[] | undefined;
}, {
    name: string;
    id: string;
    description: string;
    trigger: {
        intentPatterns?: string[] | undefined;
        domains?: string[] | undefined;
        entityTypes?: string[] | undefined;
        minComplexity?: "simple" | "medium" | "complex" | undefined;
    };
    tags?: string[] | undefined;
    embedding?: number[] | undefined;
    source?: "crystallized" | "plugin" | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    steps?: string[] | undefined;
    successRate?: number | undefined;
    toolChain?: {
        toolName: string;
        argumentTemplate?: Record<string, unknown> | undefined;
    }[] | undefined;
    maturity?: "progenitor" | "committed" | "mature" | undefined;
    activationCount?: number | undefined;
}>;
export type Skill = z.infer<typeof SkillSchema>;
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
//# sourceMappingURL=skill.d.ts.map