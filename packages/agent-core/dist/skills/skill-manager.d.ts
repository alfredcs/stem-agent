import type { Skill, ISkillRegistry, IMemoryManager, PerceptionResult, ExecutionPlan } from "@stem-agent/shared";
import { SkillSchema } from "@stem-agent/shared";
import type { z } from "zod";
/** Input shape for plugin skills — respects Zod defaults (source, steps, entityTypes, etc.). */
export type SkillPluginInput = Omit<z.input<typeof SkillSchema>, "id" | "createdAt" | "updatedAt">;
import { type Logger } from "@stem-agent/shared";
/**
 * In-memory implementation of ISkillRegistry.
 * Skills are stored in a Map keyed by ID.
 */
export declare class InMemorySkillRegistry implements ISkillRegistry {
    private readonly skills;
    private readonly log;
    constructor(logger?: Logger);
    register(skill: Skill): Promise<void>;
    deregister(skillId: string): Promise<void>;
    match(intent: string, domain?: string, entityTypes?: string[]): Promise<Skill[]>;
    get(skillId: string): Promise<Skill | null>;
    getByName(name: string): Promise<Skill | null>;
    listAll(): Promise<Skill[]>;
    recordOutcome(skillId: string, success: boolean): Promise<void>;
    private advanceMaturity;
}
/**
 * SkillManager handles the full skill lifecycle:
 *
 * 1. **Crystallization** (Learn phase): detects recurring successful patterns
 *    in episodic memory and creates progenitor skills.
 * 2. **Matching** (Plan phase): finds skills that match the current request,
 *    allowing the pipeline to skip detailed reasoning.
 * 3. **Invocation**: converts a matched skill into an ExecutionPlan.
 * 4. **Maturation**: tracks outcomes and advances skill maturity
 *    (progenitor → committed → mature), or triggers apoptosis.
 * 5. **Plugin management**: manual register/deregister for user-configured skills.
 *
 * Biological analogy:
 * - Internal cues: episode patterns, procedure success rates
 * - External cues: MCP tool availability, caller domain, entity types
 * - Gene expression: pattern threshold met → skill crystallized
 * - Maturation: repeated successful activation → committed → mature
 * - Apoptosis: persistent failure → skill removed
 */
export declare class SkillManager {
    private readonly registry;
    private readonly memory;
    private readonly log;
    constructor(registry: ISkillRegistry, memory: IMemoryManager, logger?: Logger);
    /** Expose the registry for direct access (e.g., listing skills). */
    getRegistry(): ISkillRegistry;
    /** Manually register a skill plugin. */
    registerPlugin(skill: SkillPluginInput): Promise<Skill>;
    /** Remove a skill by ID. */
    removePlugin(skillId: string): Promise<void>;
    /** Remove a skill by name. */
    removePluginByName(name: string): Promise<void>;
    /**
     * Find skills that match the current perception.
     * Returns skills sorted by relevance. Empty array = no match.
     */
    matchSkills(perception: PerceptionResult): Promise<Skill[]>;
    /**
     * Convert a matched skill into an ExecutionPlan.
     * The plan uses the skill's tool chain or procedure steps.
     */
    skillToPlan(skill: Skill, goal: string): ExecutionPlan;
    /** Record whether a skill invocation succeeded or failed. */
    recordOutcome(skillId: string, success: boolean): Promise<void>;
    /**
     * Attempt to crystallize new skills from recent episodes.
     *
     * This is the "gene expression" step: when enough episodes share a
     * common pattern (same intent, same tool sequence, successful outcome),
     * a new progenitor skill is born.
     *
     * Called asynchronously in the Learn phase.
     */
    tryCrystallize(): Promise<Skill[]>;
    /**
     * Detect recurring patterns in episodes.
     * Groups episodes by shared actions and extracts common sequences.
     */
    private detectPatterns;
    /** Extract common topics/keywords from episode summaries and context. */
    private extractCommonTopics;
}
//# sourceMappingURL=skill-manager.d.ts.map