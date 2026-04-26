import type {
  IMemoryManager,
  ReasoningResult,
  MCPTool,
  ExecutionPlan,
  PlanStep,
  BehaviorParameters,
} from "@stem-agent/shared";
import { ExecutionPlanSchema, PlanStepSchema } from "@stem-agent/shared";
import { createLogger, type Logger } from "@stem-agent/shared";
import { z } from "zod";
import type { AgentCoreConfig } from "../config.js";
import type { ILLMClient } from "../llm/index.js";

/**
 * Planning Engine — converts reasoning results into executable plans.
 *
 * Queries procedural memory for known strategies, generates plan steps
 * from reasoning, computes parallel execution groups from the dependency
 * graph, and supports adaptive re-planning on step failure.
 */
export class PlanningEngine {
  private readonly memory: IMemoryManager;
  private readonly maxPlanSteps: number;
  private readonly log: Logger;
  private readonly llmClient?: ILLMClient;
  private readonly systemPromptPrefix?: string;

  constructor(
    memory: IMemoryManager,
    config: AgentCoreConfig,
    llmClient?: ILLMClient,
    systemPromptPrefix?: string,
  ) {
    this.memory = memory;
    this.maxPlanSteps = config.maxPlanSteps;
    this.llmClient = llmClient;
    this.systemPromptPrefix = systemPromptPrefix;
    this.log = createLogger("planning-engine");
  }

  /**
   * Create an execution plan from a reasoning result.
   *
   * @param reasoning - The reasoning result to plan for.
   * @param availableTools - MCP tools currently available.
   * @returns Validated ExecutionPlan.
   */
  async createPlan(
    reasoning: ReasoningResult,
    availableTools: MCPTool[],
    behavior?: BehaviorParameters,
  ): Promise<ExecutionPlan> {
    const toolNames = new Set(availableTools.map((t) => t.name));

    // Try procedural memory first
    const procedure = await this.tryProceduralMemory(reasoning.conclusion);
    if (procedure) {
      this.log.debug({ procedure: procedure.name }, "Using known procedure");
      return this.planFromProcedure(procedure, reasoning);
    }

    // Try LLM-based plan generation
    if (this.llmClient) {
      const llmSteps = await this.llmGenerateSteps(reasoning, toolNames);
      if (llmSteps) {
        const parallelGroups = this.computeParallelGroups(llmSteps);
        const estimatedCostUsd = this.estimateCost(llmSteps);
        const plan = ExecutionPlanSchema.parse({
          goal: reasoning.conclusion,
          steps: llmSteps,
          estimatedTotalConfidence: reasoning.confidence,
          parallelGroups,
          rollbackStrategy: "Revert to last successful step and re-plan",
          estimatedCostUsd,
        });
        this.log.debug(
          { stepCount: llmSteps.length, parallelGroups: parallelGroups.length },
          "LLM plan created",
        );
        return plan;
      }
    }

    // Generate steps from reasoning
    const steps = this.generateSteps(reasoning, toolNames, behavior);
    const parallelGroups = this.computeParallelGroups(steps);
    const estimatedCostUsd = this.estimateCost(steps);

    const plan = ExecutionPlanSchema.parse({
      goal: reasoning.conclusion,
      steps,
      estimatedTotalConfidence: reasoning.confidence,
      parallelGroups,
      rollbackStrategy: "Revert to last successful step and re-plan",
      estimatedCostUsd,
    });

    this.log.debug(
      { stepCount: steps.length, parallelGroups: parallelGroups.length },
      "Plan created",
    );
    return plan;
  }

  /**
   * Re-plan after a step failure: remove failed step, insert fallback,
   * recompute parallel groups.
   *
   * @param plan - Original plan.
   * @param failedStepId - The step that failed.
   * @param error - Error message from the failure.
   * @returns A new plan with the failed step replaced or removed.
   */
  async replan(
    plan: ExecutionPlan,
    failedStepId: number,
    error: string,
  ): Promise<ExecutionPlan> {
    this.log.info({ failedStepId, error }, "Re-planning after step failure");

    const failedStep = plan.steps.find((s) => s.stepId === failedStepId);
    let newSteps: PlanStep[];

    if (failedStep?.fallbackAction) {
      // Replace failed step with its fallback
      newSteps = plan.steps.map((s) =>
        s.stepId === failedStepId
          ? {
              ...s,
              description: `[FALLBACK] ${failedStep.fallbackAction}`,
              actionType: "reasoning" as const,
              toolName: undefined,
              toolArguments: undefined,
            }
          : s,
      );
    } else {
      // Remove the failed step and adjust dependencies
      newSteps = plan.steps
        .filter((s) => s.stepId !== failedStepId)
        .map((s) => ({
          ...s,
          dependsOn: s.dependsOn.filter((d) => d !== failedStepId),
        }));
    }

    const parallelGroups = this.computeParallelGroups(newSteps);

    return ExecutionPlanSchema.parse({
      goal: plan.goal,
      steps: newSteps,
      estimatedTotalConfidence: Math.max(plan.estimatedTotalConfidence - 0.1, 0),
      parallelGroups,
      rollbackStrategy: plan.rollbackStrategy,
      estimatedCostUsd: this.estimateCost(newSteps),
    });
  }

  /** Use LLM to generate plan steps. Returns null on failure. */
  private async llmGenerateSteps(
    reasoning: ReasoningResult,
    toolNames: Set<string>,
  ): Promise<PlanStep[] | null> {
    try {
      const toolList = [...toolNames].join(", ");
      const planSystem = [
        "Generate an execution plan as a JSON array of PlanStep objects.",
        "Each step: {\"stepId\": number, \"actionType\": \"tool_call\"|\"reasoning\"|\"response\", \"description\": string, \"dependsOn\": number[], \"estimatedConfidence\": number, \"toolName\"?: string, \"toolArguments\"?: object, \"fallbackAction\"?: string}",
        `Available tools: [${toolList}]`,
        `Max steps: ${this.maxPlanSteps}`,
        "Return ONLY the JSON array.",
      ].join("\n");
      const systemContent = this.systemPromptPrefix
        ? `${this.systemPromptPrefix}\n\n${planSystem}`
        : planSystem;
      const result = await this.llmClient!.chat([
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: `Goal: ${reasoning.conclusion}\nStrategy: ${reasoning.strategyUsed}\nSteps: ${reasoning.steps.map((s) => s.thought).join("; ")}`,
        },
      ], { temperature: 0.2 });

      const raw = result.content.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      const parsed = JSON.parse(raw);
      const validated = z.array(PlanStepSchema).safeParse(parsed);
      if (validated.success) {
        return validated.data.slice(0, this.maxPlanSteps);
      }
      this.log.warn({ errors: validated.error.issues }, "LLM plan validation failed");
    } catch (err) {
      this.log.warn({ err }, "LLM plan generation failed, falling back to deterministic");
    }
    return null;
  }

  /** Try to retrieve a matching procedure from procedural memory. */
  private async tryProceduralMemory(goal: string) {
    try {
      const proc = await this.memory.getBestProcedure(goal);
      if (proc && proc.successRate > 0.7) return proc;
    } catch {
      // Memory unavailable — fall through to generation
    }
    return null;
  }

  /** Convert a known procedure into a plan. */
  private planFromProcedure(
    procedure: { name: string; steps: string[]; successRate: number },
    reasoning: ReasoningResult,
  ): ExecutionPlan {
    const steps: PlanStep[] = procedure.steps.map((desc, i, arr) => ({
      stepId: i + 1,
      actionType: i === arr.length - 1 ? "response" as const : "reasoning" as const,
      description: desc,
      dependsOn: i > 0 ? [i] : [],
      estimatedConfidence: procedure.successRate,
    }));

    // All sequential for known procedures
    const parallelGroups = steps.map((s) => [s.stepId]);

    return ExecutionPlanSchema.parse({
      goal: reasoning.conclusion,
      steps,
      estimatedTotalConfidence: procedure.successRate,
      parallelGroups,
    });
  }

  /** Generate plan steps from reasoning result. */
  private generateSteps(
    reasoning: ReasoningResult,
    toolNames: Set<string>,
    behavior?: BehaviorParameters,
  ): PlanStep[] {
    const steps: PlanStep[] = [];

    if (reasoning.strategyUsed === "react") {
      // Convert reasoning steps with actions into plan steps
      for (const rStep of reasoning.steps) {
        if (steps.length >= this.maxPlanSteps) break;
        if (rStep.action && rStep.action !== "discover_tools") {
          const isToolCall = toolNames.has(rStep.action);
          const preferTools = (behavior?.toolUsePreference ?? 0.5) > 0.7;
          const avoidTools = (behavior?.toolUsePreference ?? 0.5) < 0.3;
          const effectiveToolCall = isToolCall && !avoidTools || preferTools && toolNames.size > 0;
          steps.push({
            stepId: steps.length + 1,
            actionType: effectiveToolCall ? "tool_call" : "reasoning",
            description: rStep.thought,
            toolName: effectiveToolCall ? rStep.action : undefined,
            toolArguments: effectiveToolCall ? {} : undefined,
            dependsOn: steps.length > 0 ? [steps.length] : [],
            estimatedConfidence: rStep.confidence,
          });
        }
      }
    }

    // If no tool steps were generated, add a single response step
    if (steps.length === 0) {
      steps.push({
        stepId: 1,
        actionType: "response",
        description: reasoning.conclusion,
        dependsOn: [],
        estimatedConfidence: reasoning.confidence,
      });
    }

    return steps;
  }

  /**
   * Compute parallel execution groups from the dependency graph.
   * Steps whose dependencies are all satisfied by earlier groups
   * can run in parallel within the same group.
   */
  computeParallelGroups(steps: PlanStep[]): number[][] {
    const groups: number[][] = [];
    const completed = new Set<number>();

    const remaining = new Set(steps.map((s) => s.stepId));
    const stepMap = new Map(steps.map((s) => [s.stepId, s]));

    while (remaining.size > 0) {
      const group: number[] = [];

      for (const id of remaining) {
        const step = stepMap.get(id)!;
        const depsReady = step.dependsOn.every((d) => completed.has(d));
        if (depsReady) {
          group.push(id);
        }
      }

      if (group.length === 0) {
        // Circular dependency — force remaining into one group
        groups.push([...remaining]);
        break;
      }

      groups.push(group);
      for (const id of group) {
        completed.add(id);
        remaining.delete(id);
      }
    }

    return groups;
  }

  /** Estimate cost in USD based on step types. */
  private estimateCost(steps: PlanStep[]): number {
    const COST_PER_TOOL_CALL = 0.01;
    const COST_PER_REASONING = 0.005;

    let cost = 0;
    for (const step of steps) {
      if (step.actionType === "tool_call") cost += COST_PER_TOOL_CALL;
      else cost += COST_PER_REASONING;
    }
    return Math.round(cost * 1000) / 1000;
  }
}
