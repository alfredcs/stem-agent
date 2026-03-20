import type {
  Skill,
  ISkillRegistry,
  SkillMaturity,
  IMemoryManager,
  Episode,
  PerceptionResult,
  ExecutionPlan,
  PlanStep,
} from "@stem-agent/shared";
import { SkillSchema, ExecutionPlanSchema } from "@stem-agent/shared";
import { createLogger, type Logger } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Maturity thresholds (cell differentiation stages)
// ---------------------------------------------------------------------------

/** Activations needed to advance from progenitor → committed. */
const COMMITTED_THRESHOLD = 3;
/** Activations needed to advance from committed → mature. */
const MATURE_THRESHOLD = 10;
/** Minimum success rate to advance maturity. */
const ADVANCE_MIN_SUCCESS = 0.6;
/** Success rate below which a skill regresses or is removed. */
const REGRESSION_THRESHOLD = 0.3;
/** Minimum episodes with shared pattern to crystallize a skill. */
const CRYSTALLIZATION_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// In-memory Skill Registry
// ---------------------------------------------------------------------------

/**
 * In-memory implementation of ISkillRegistry.
 * Skills are stored in a Map keyed by ID.
 */
export class InMemorySkillRegistry implements ISkillRegistry {
  private readonly skills = new Map<string, Skill>();
  private readonly log: Logger;

  constructor(logger?: Logger) {
    this.log = logger ?? createLogger("skill-registry");
  }

  async register(skill: Skill): Promise<void> {
    this.skills.set(skill.id, skill);
    this.log.debug({ id: skill.id, name: skill.name, source: skill.source }, "skill registered");
  }

  async deregister(skillId: string): Promise<void> {
    const skill = this.skills.get(skillId);
    this.skills.delete(skillId);
    if (skill) {
      this.log.info({ id: skillId, name: skill.name }, "skill deregistered");
    }
  }

  async match(intent: string, domain?: string, entityTypes?: string[]): Promise<Skill[]> {
    const matches: Array<{ skill: Skill; score: number }> = [];
    const intentLower = intent.toLowerCase();
    const domainLower = domain?.toLowerCase();

    for (const skill of this.skills.values()) {
      let score = 0;
      const trigger = skill.trigger;

      // Intent pattern matching
      for (const pattern of trigger.intentPatterns) {
        if (intentLower.includes(pattern.toLowerCase())) {
          score += 3;
          break;
        }
        try {
          if (new RegExp(pattern, "i").test(intent)) {
            score += 3;
            break;
          }
        } catch {
          // Invalid regex — skip
        }
      }

      // Domain matching
      if (domainLower && trigger.domains.length > 0) {
        for (const d of trigger.domains) {
          if (domainLower.includes(d.toLowerCase())) {
            score += 2;
            break;
          }
        }
      }

      // Entity type matching
      if (entityTypes && trigger.entityTypes.length > 0) {
        const overlap = entityTypes.filter((e) =>
          trigger.entityTypes.some((t) => t.toLowerCase() === e.toLowerCase()),
        );
        score += overlap.length;
      }

      // Maturity bonus
      if (skill.maturity === "mature") score += 2;
      else if (skill.maturity === "committed") score += 1;

      if (score > 0) {
        matches.push({ skill, score });
      }
    }

    // Sort by score descending, then by success rate
    matches.sort((a, b) => b.score - a.score || b.skill.successRate - a.skill.successRate);
    return matches.map((m) => m.skill);
  }

  async get(skillId: string): Promise<Skill | null> {
    return this.skills.get(skillId) ?? null;
  }

  async getByName(name: string): Promise<Skill | null> {
    for (const skill of this.skills.values()) {
      if (skill.name === name) return skill;
    }
    return null;
  }

  async listAll(): Promise<Skill[]> {
    return [...this.skills.values()];
  }

  async recordOutcome(skillId: string, success: boolean): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    const newCount = skill.activationCount + 1;
    const newRate = (skill.successRate * skill.activationCount + (success ? 1 : 0)) / newCount;
    const newMaturity = this.advanceMaturity(skill.maturity, newCount, newRate);

    // Regress or remove unreliable skills
    if (newCount >= MATURE_THRESHOLD && newRate < REGRESSION_THRESHOLD && skill.source === "crystallized") {
      this.skills.delete(skillId);
      this.log.info({ id: skillId, name: skill.name, successRate: newRate }, "skill apoptosis (removed due to low success)");
      return;
    }

    this.skills.set(skillId, {
      ...skill,
      activationCount: newCount,
      successRate: newRate,
      maturity: newMaturity,
      updatedAt: Date.now(),
    });

    if (newMaturity !== skill.maturity) {
      this.log.info(
        { id: skillId, name: skill.name, from: skill.maturity, to: newMaturity },
        "skill maturity advanced",
      );
    }
  }

  private advanceMaturity(current: SkillMaturity, count: number, rate: number): SkillMaturity {
    if (rate < ADVANCE_MIN_SUCCESS) return current;
    if (current === "progenitor" && count >= COMMITTED_THRESHOLD) return "committed";
    if (current === "committed" && count >= MATURE_THRESHOLD) return "mature";
    return current;
  }
}

// ---------------------------------------------------------------------------
// SkillManager — orchestrates skill lifecycle
// ---------------------------------------------------------------------------

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
export class SkillManager {
  private readonly registry: ISkillRegistry;
  private readonly memory: IMemoryManager;
  private readonly log: Logger;

  constructor(registry: ISkillRegistry, memory: IMemoryManager, logger?: Logger) {
    this.registry = registry;
    this.memory = memory;
    this.log = logger ?? createLogger("skill-manager");
  }

  /** Expose the registry for direct access (e.g., listing skills). */
  getRegistry(): ISkillRegistry {
    return this.registry;
  }

  // ---- Plugin Management (Induced Differentiation) ----------------------

  /** Manually register a skill plugin. */
  async registerPlugin(skill: Omit<Skill, "id" | "createdAt" | "updatedAt">): Promise<Skill> {
    const full = SkillSchema.parse({
      ...skill,
      id: randomUUID(),
      source: "plugin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await this.registry.register(full);
    this.log.info({ name: full.name }, "plugin skill registered");
    return full;
  }

  /** Remove a skill by ID. */
  async removePlugin(skillId: string): Promise<void> {
    await this.registry.deregister(skillId);
  }

  /** Remove a skill by name. */
  async removePluginByName(name: string): Promise<void> {
    const skill = await this.registry.getByName(name);
    if (skill) {
      await this.registry.deregister(skill.id);
    }
  }

  // ---- Matching (Skill Selection) ----------------------------------------

  /**
   * Find skills that match the current perception.
   * Returns skills sorted by relevance. Empty array = no match.
   */
  async matchSkills(perception: PerceptionResult): Promise<Skill[]> {
    const entityTypes = perception.entities.map((e) => e.type);
    return this.registry.match(
      perception.intent,
      perception.domain,
      entityTypes,
    );
  }

  // ---- Invocation (Skill → Plan) ----------------------------------------

  /**
   * Convert a matched skill into an ExecutionPlan.
   * The plan uses the skill's tool chain or procedure steps.
   */
  skillToPlan(skill: Skill, goal: string): ExecutionPlan {
    const steps: PlanStep[] = [];

    if (skill.toolChain.length > 0) {
      // Tool-chain based skill
      for (let i = 0; i < skill.toolChain.length; i++) {
        const tc = skill.toolChain[i];
        steps.push({
          stepId: i + 1,
          actionType: "tool_call",
          description: `Skill "${skill.name}" step ${i + 1}: ${tc.toolName}`,
          toolName: tc.toolName,
          toolArguments: tc.argumentTemplate,
          dependsOn: i > 0 ? [i] : [],
          estimatedConfidence: skill.successRate,
        });
      }
    } else if (skill.steps.length > 0) {
      // Procedure-based skill
      for (let i = 0; i < skill.steps.length; i++) {
        steps.push({
          stepId: i + 1,
          actionType: i === skill.steps.length - 1 ? "response" : "reasoning",
          description: skill.steps[i],
          dependsOn: i > 0 ? [i] : [],
          estimatedConfidence: skill.successRate,
        });
      }
    } else {
      // Fallback: single response step
      steps.push({
        stepId: 1,
        actionType: "response",
        description: goal,
        dependsOn: [],
        estimatedConfidence: skill.successRate,
      });
    }

    return ExecutionPlanSchema.parse({
      goal,
      steps,
      estimatedTotalConfidence: skill.successRate,
      parallelGroups: steps.map((s) => [s.stepId]),
      rollbackStrategy: "Fall back to normal reasoning pipeline",
    });
  }

  /** Record whether a skill invocation succeeded or failed. */
  async recordOutcome(skillId: string, success: boolean): Promise<void> {
    await this.registry.recordOutcome(skillId, success);
  }

  // ---- Crystallization (Pattern → Skill) ---------------------------------

  /**
   * Attempt to crystallize new skills from recent episodes.
   *
   * This is the "gene expression" step: when enough episodes share a
   * common pattern (same intent, same tool sequence, successful outcome),
   * a new progenitor skill is born.
   *
   * Called asynchronously in the Learn phase.
   */
  async tryCrystallize(): Promise<Skill[]> {
    const newSkills: Skill[] = [];

    try {
      // Recall recent successful episodes
      const recent = await this.memory.recall("completed", 50);
      const successful = recent.filter((e) => e.outcome === "completed");

      if (successful.length < CRYSTALLIZATION_THRESHOLD) return newSkills;

      // Group by action patterns
      const patterns = this.detectPatterns(successful);

      for (const pattern of patterns) {
        // Check if a similar skill already exists
        const existing = await this.registry.getByName(pattern.name);
        if (existing) continue;

        const skill = SkillSchema.parse({
          id: randomUUID(),
          name: pattern.name,
          description: pattern.description,
          steps: pattern.steps,
          toolChain: pattern.toolChain,
          trigger: {
            intentPatterns: pattern.intentPatterns,
            domains: pattern.domains,
          },
          maturity: "progenitor",
          source: "crystallized",
          activationCount: 0,
          successRate: pattern.observedSuccessRate,
          tags: pattern.tags,
        });

        await this.registry.register(skill);
        newSkills.push(skill);
        this.log.info(
          { name: skill.name, intentPatterns: pattern.intentPatterns },
          "skill crystallized from episode patterns",
        );
      }
    } catch (err) {
      this.log.warn({ err }, "crystallization failed");
    }

    return newSkills;
  }

  /**
   * Detect recurring patterns in episodes.
   * Groups episodes by shared actions and extracts common sequences.
   */
  private detectPatterns(episodes: Episode[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Group episodes by their primary action
    const byAction = new Map<string, Episode[]>();
    for (const ep of episodes) {
      const key = ep.actions.sort().join("+");
      if (!byAction.has(key)) byAction.set(key, []);
      byAction.get(key)!.push(ep);
    }

    for (const [actionKey, group] of byAction) {
      if (group.length < CRYSTALLIZATION_THRESHOLD) continue;

      // Extract common context keys across the group
      const commonTopics = this.extractCommonTopics(group);
      if (commonTopics.length === 0) continue;

      const actions = actionKey.split("+");
      patterns.push({
        name: `auto_${actions.join("_")}_${commonTopics[0]}`,
        description: `Auto-crystallized skill for ${actions.join(", ")} in ${commonTopics.join(", ")} context`,
        steps: actions,
        toolChain: [],
        intentPatterns: commonTopics,
        domains: commonTopics,
        tags: [...actions, ...commonTopics],
        observedSuccessRate: group.filter((e) => e.outcome === "completed").length / group.length,
      });
    }

    return patterns;
  }

  /** Extract common topics/keywords from episode summaries and context. */
  private extractCommonTopics(episodes: Episode[]): string[] {
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(["the", "a", "an", "is", "was", "task", "completed", "failed", "process"]);

    for (const ep of episodes) {
      const text = [ep.summary ?? "", ...Object.values(ep.context).map(String)].join(" ");
      const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && !stopWords.has(w));
      const unique = new Set(words);
      for (const word of unique) {
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }

    // Words that appear in at least half the episodes
    const threshold = Math.ceil(episodes.length / 2);
    return [...wordFreq.entries()]
      .filter(([, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }
}

/** Internal type for detected episode patterns. */
interface DetectedPattern {
  name: string;
  description: string;
  steps: string[];
  toolChain: Array<{ toolName: string; argumentTemplate: Record<string, unknown> }>;
  intentPatterns: string[];
  domains: string[];
  tags: string[];
  observedSuccessRate: number;
}
