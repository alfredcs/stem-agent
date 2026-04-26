import type {
  IMCPManager,
  IMemoryManager,
  PerceptionResult,
  ReasoningResult,
  ReasoningStep,
  ReasoningStrategy,
  BehaviorParameters,
} from "@stem-agent/shared";
import { ReasoningResultSchema } from "@stem-agent/shared";
import { createLogger, type Logger, BaseError } from "@stem-agent/shared";
import { StrategySelector } from "./strategy-selector.js";
import type { AgentCoreConfig } from "../config.js";
import type { ILLMClient } from "../llm/index.js";
import type { CostGuardrail } from "../llm/index.js";

/**
 * Reasoning Engine — applies multi-strategy reasoning to a perception.
 *
 * Strategies are deterministic in v0 (no LLM calls). Each strategy
 * produces structured reasoning steps from perception data. LLM
 * integration plugs into the same interface in a future version.
 */
export class ReasoningEngine {
  private readonly mcp: IMCPManager;
  private readonly memory: IMemoryManager;
  private readonly selector: StrategySelector;
  private readonly maxSteps: number;
  private readonly log: Logger;
  private readonly llmClient?: ILLMClient;
  private readonly costGuardrail?: CostGuardrail;
  private readonly systemPromptPrefix?: string;

  constructor(
    mcp: IMCPManager,
    memory: IMemoryManager,
    config: AgentCoreConfig,
    llmClient?: ILLMClient,
    costGuardrail?: CostGuardrail,
    systemPromptPrefix?: string,
  ) {
    this.mcp = mcp;
    this.memory = memory;
    this.selector = new StrategySelector();
    this.maxSteps = config.maxReasoningSteps;
    this.llmClient = llmClient;
    this.costGuardrail = costGuardrail;
    this.systemPromptPrefix = systemPromptPrefix;
    this.log = createLogger("reasoning-engine");
  }

  /**
   * Reason about a perceived message and produce a structured result.
   *
   * @param perception - Output from the perception engine.
   * @param behavior - Current behavior parameters.
   * @param strategyOverride - When provided, bypasses the strategy selector.
   *   Used by DomainPersona.preferredStrategy to pin differentiated agents.
   * @returns Validated ReasoningResult.
   */
  async reason(
    perception: PerceptionResult,
    behavior: BehaviorParameters,
    strategyOverride?: ReasoningStrategy,
  ): Promise<ReasoningResult> {
    const requiresTools = (perception.context as Record<string, unknown>).toolsRequired === true
      || perception.entities.some((e) => e.type === "url");
    const strategy = strategyOverride ?? this.selector.select(perception, requiresTools);

    this.log.debug(
      { strategy, intent: perception.intent, override: !!strategyOverride },
      "Strategy selected",
    );

    let result: ReasoningResult;
    switch (strategy) {
      case "chain_of_thought":
        result = await this.chainOfThought(perception, behavior);
        break;
      case "react":
        result = await this.react(perception, behavior);
        break;
      case "reflexion":
        result = await this.reflexion(perception, behavior);
        break;
      case "internal_debate":
        result = await this.internalDebate(perception, behavior);
        break;
      case "tree_of_thought":
      case "analogical":
        throw new BaseError(`Strategy "${strategy}" is PLANNED but not yet implemented`, {
          code: "NOT_IMPLEMENTED",
          statusCode: 501,
        });
      default: {
        const _exhaustive: never = strategy;
        throw new BaseError(`Unknown strategy: ${_exhaustive}`);
      }
    }

    this.log.debug(
      { strategy: result.strategyUsed, confidence: result.confidence, steps: result.steps.length },
      "Reasoning complete",
    );
    return result;
  }

  /**
   * Try an LLM chat call with cost guardrail. Returns null on failure.
   *
   * When a persona systemPromptPrefix is configured, it is prepended to
   * the first system message (or inserted as a new system message at the
   * front) so every reasoning step stays in character for the differentiated
   * agent.
   */
  private async llmChat(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    opts?: { temperature?: number },
  ): Promise<string | null> {
    if (!this.llmClient) return null;
    try {
      const withPersona = this.injectPersonaPrefix(messages);
      this.costGuardrail?.checkBudget("reasoning");
      const result = await this.llmClient.chat(withPersona, opts);
      this.costGuardrail?.recordCost("reasoning", result.costUsd);
      return result.content;
    } catch (err) {
      this.log.warn({ err }, "LLM call failed in reasoning");
      return null;
    }
  }

  private injectPersonaPrefix(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  ): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    const prefix = this.systemPromptPrefix;
    if (!prefix) return messages;
    if (messages.length > 0 && messages[0].role === "system") {
      return [
        { role: "system", content: `${prefix}\n\n${messages[0].content}` },
        ...messages.slice(1),
      ];
    }
    return [{ role: "system", content: prefix }, ...messages];
  }

  /** Chain-of-Thought: sequential reasoning steps without tool use. */
  private async chainOfThought(
    perception: PerceptionResult,
    behavior: BehaviorParameters,
  ): Promise<ReasoningResult> {
    // LLM-powered path
    if (this.llmClient) {
      const llmResult = await this.llmChainOfThought(perception);
      if (llmResult) return llmResult;
    }

    const steps: ReasoningStep[] = [];
    const trace: string[] = [];
    const depth = Math.min(behavior.reasoningDepth, this.maxSteps);

    // Step 1: Understand the intent
    steps.push({
      stepId: 1,
      thought: `The user's intent is "${perception.intent}" with ${perception.complexity} complexity.`,
      confidence: 0.9,
    });
    trace.push(`Step 1: Identified intent as "${perception.intent}"`);

    // Step 2: Consider entities
    if (perception.entities.length > 0) {
      steps.push({
        stepId: 2,
        thought: `Found ${perception.entities.length} entities: ${perception.entities.map((e) => e.type).join(", ")}.`,
        confidence: 0.85,
      });
      trace.push(`Step 2: Extracted ${perception.entities.length} entities`);
    }

    // Step 3+: Fill remaining depth with analysis
    for (let i = steps.length + 1; i <= depth; i++) {
      steps.push({
        stepId: i,
        thought: `Analyzing aspect ${i} of the ${perception.intent} request.`,
        confidence: 0.8,
      });
      trace.push(`Step ${i}: Analysis of request aspect`);
    }

    const avgConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

    return ReasoningResultSchema.parse({
      conclusion: `Completed chain-of-thought analysis for "${perception.intent}" request.`,
      confidence: avgConfidence,
      strategyUsed: "chain_of_thought" as ReasoningStrategy,
      steps,
      evidence: perception.entities.map((e) => `Entity: ${e.name} (${e.type})`),
      alternativeConclusions: [],
      trace,
    });
  }

  /** ReAct: Reason-Act-Observe loop using MCP tools. */
  private async react(
    perception: PerceptionResult,
    behavior: BehaviorParameters,
  ): Promise<ReasoningResult> {
    // LLM-powered path
    if (this.llmClient) {
      const llmResult = await this.llmReact(perception);
      if (llmResult) return llmResult;
    }

    const steps: ReasoningStep[] = [];
    const trace: string[] = [];
    const evidence: string[] = [];
    const maxSteps = Math.min(behavior.reasoningDepth * 2, this.maxSteps);

    // Initial thought
    steps.push({
      stepId: 1,
      thought: `Need to address "${perception.intent}" request. Checking available tools.`,
      action: "discover_tools",
      confidence: 0.7,
    });
    trace.push("Step 1: Identifying relevant tools");

    // Discover capabilities
    let tools: Awaited<ReturnType<IMCPManager["discoverCapabilities"]>> = [];
    try {
      tools = await this.mcp.discoverCapabilities();
      steps.push({
        stepId: 2,
        thought: `Found ${tools.length} available tools.`,
        observation: `Tools: ${tools.map((t) => t.name).join(", ")}`,
        confidence: 0.8,
      });
      trace.push(`Step 2: Discovered ${tools.length} tools`);
      evidence.push(`Available tools: ${tools.length}`);
    } catch (err) {
      steps.push({
        stepId: 2,
        thought: "Tool discovery failed, proceeding without tools.",
        observation: `Error: ${err instanceof Error ? err.message : String(err)}`,
        confidence: 0.5,
      });
      trace.push("Step 2: Tool discovery failed");
    }

    // Act on entities that look like tool targets
    let stepId = 3;
    for (const entity of perception.entities) {
      if (stepId > maxSteps) break;

      if (entity.type === "url" && tools.length > 0) {
        steps.push({
          stepId,
          thought: `Entity "${entity.name}" may require tool invocation.`,
          action: `lookup_${entity.type}`,
          confidence: 0.7,
        });
        trace.push(`Step ${stepId}: Identified actionable entity "${entity.name}"`);
        stepId++;
      }
    }

    // Final synthesis
    steps.push({
      stepId,
      thought: "Synthesizing observations into conclusion.",
      confidence: 0.75,
    });
    trace.push(`Step ${stepId}: Synthesis`);

    const avgConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

    return ReasoningResultSchema.parse({
      conclusion: `ReAct analysis complete for "${perception.intent}" with ${tools.length} tools available.`,
      confidence: avgConfidence,
      strategyUsed: "react" as ReasoningStrategy,
      steps,
      evidence,
      alternativeConclusions: [],
      trace,
    });
  }

  /** Reflexion: Chain-of-thought + self-reflection pass. */
  private async reflexion(
    perception: PerceptionResult,
    behavior: BehaviorParameters,
  ): Promise<ReasoningResult> {
    // First pass: chain of thought (may use LLM internally)
    const initial = await this.chainOfThought(perception, behavior);

    // LLM-powered reflection
    if (this.llmClient) {
      const reviewContent = await this.llmChat([
        {
          role: "system",
          content: "Review the following reasoning conclusion for gaps, contradictions, or missed perspectives. Return JSON: {\"review\": string, \"revisedConfidence\": number 0-1, \"hasIssues\": boolean}",
        },
        {
          role: "user",
          content: `Conclusion: ${initial.conclusion}\nSteps: ${initial.steps.map((s) => s.thought).join("; ")}`,
        },
      ], { temperature: 0.2 });

      if (reviewContent) {
        try {
          const review = JSON.parse(reviewContent);
          const reflectionStep: ReasoningStep = {
            stepId: initial.steps.length + 1,
            thought: `LLM Reflection: ${review.review}`,
            confidence: review.revisedConfidence ?? initial.confidence,
          };
          return ReasoningResultSchema.parse({
            conclusion: initial.conclusion,
            confidence: reflectionStep.confidence,
            strategyUsed: "reflexion" as ReasoningStrategy,
            steps: [...initial.steps, reflectionStep],
            evidence: initial.evidence,
            alternativeConclusions: [],
            trace: [...initial.trace, `Step ${reflectionStep.stepId}: LLM self-reflection`],
          });
        } catch {
          this.log.warn("Failed to parse LLM reflection, falling back to heuristic");
        }
      }
    }

    // Self-reflection pass
    const reflectionStep: ReasoningStep = {
      stepId: initial.steps.length + 1,
      thought: `Self-reflection: The initial reasoning used ${initial.steps.length} steps with confidence ${initial.confidence.toFixed(2)}. ` +
        `Checking for contradictions and gaps.`,
      confidence: Math.min(initial.confidence + 0.05, 1),
    };

    const hasContradictions = this.detectContradictions(initial.steps);
    if (hasContradictions) {
      reflectionStep.thought += " Potential contradictions detected — confidence reduced.";
      reflectionStep.confidence = Math.max(initial.confidence - behavior.confidenceThreshold * 0.2, 0);
    } else {
      reflectionStep.thought += " No contradictions found — reasoning appears sound.";
    }

    const steps = [...initial.steps, reflectionStep];
    const trace = [
      ...initial.trace,
      `Step ${reflectionStep.stepId}: Self-reflection (contradictions: ${hasContradictions})`,
    ];

    return ReasoningResultSchema.parse({
      conclusion: initial.conclusion,
      confidence: reflectionStep.confidence,
      strategyUsed: "reflexion" as ReasoningStrategy,
      steps,
      evidence: initial.evidence,
      alternativeConclusions: [],
      trace,
    });
  }

  /** Internal Debate: multiple perspectives synthesized. */
  private async internalDebate(
    perception: PerceptionResult,
    behavior: BehaviorParameters,
  ): Promise<ReasoningResult> {
    // LLM-powered path
    if (this.llmClient) {
      const llmResult = await this.llmInternalDebate(perception);
      if (llmResult) return llmResult;
    }

    const perspectives = ["pragmatic", "thorough", "creative"] as const;
    const steps: ReasoningStep[] = [];
    const trace: string[] = [];
    const alternativeConclusions: string[] = [];

    for (let i = 0; i < perspectives.length; i++) {
      const perspective = perspectives[i];
      const thought = this.generatePerspective(perspective, perception);
      steps.push({
        stepId: i + 1,
        thought,
        action: `argue_${perspective}`,
        confidence: behavior.creativityLevel * 0.7 + 0.3 + i * 0.05,
      });
      trace.push(`Step ${i + 1}: ${perspective} perspective`);
      alternativeConclusions.push(`[${perspective}] ${thought}`);
    }

    // Synthesis step
    const synthesisStep: ReasoningStep = {
      stepId: perspectives.length + 1,
      thought: `Synthesizing ${perspectives.length} perspectives on "${perception.intent}" request.`,
      confidence: 0.8,
    };
    steps.push(synthesisStep);
    trace.push(`Step ${synthesisStep.stepId}: Synthesis of perspectives`);

    const avgConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;

    return ReasoningResultSchema.parse({
      conclusion: `Debate synthesis for "${perception.intent}": balanced conclusion incorporating pragmatic, thorough, and creative viewpoints.`,
      confidence: avgConfidence,
      strategyUsed: "internal_debate" as ReasoningStrategy,
      steps,
      evidence: [],
      alternativeConclusions,
      trace,
    });
  }

  /** Generate a perspective argument for internal debate. */
  private generatePerspective(
    perspective: "pragmatic" | "thorough" | "creative",
    perception: PerceptionResult,
  ): string {
    switch (perspective) {
      case "pragmatic":
        return `From a pragmatic standpoint, the "${perception.intent}" request should be addressed with minimal overhead and direct action.`;
      case "thorough":
        return `A thorough approach to "${perception.intent}" requires examining all ${perception.entities.length} entities and considering edge cases.`;
      case "creative":
        return `Creatively, the "${perception.intent}" request could be approached from an unconventional angle to yield novel insights.`;
    }
  }

  /** LLM-powered chain-of-thought. */
  private async llmChainOfThought(perception: PerceptionResult): Promise<ReasoningResult | null> {
    const content = await this.llmChat([
      {
        role: "system",
        content: "Think step by step about the user's request. Return JSON: {\"steps\": [{\"stepId\": number, \"thought\": string, \"confidence\": number}], \"conclusion\": string}",
      },
      {
        role: "user",
        content: `Intent: ${perception.intent}. Complexity: ${perception.complexity}. Entities: ${perception.entities.map((e) => `${e.name}(${e.type})`).join(", ")}`,
      },
    ], { temperature: 0.3 });

    if (!content) return null;
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.steps) || !parsed.conclusion) return null;
      const avgConfidence = parsed.steps.reduce((s: number, st: { confidence: number }) => s + st.confidence, 0) / parsed.steps.length;
      return ReasoningResultSchema.parse({
        conclusion: parsed.conclusion,
        confidence: avgConfidence,
        strategyUsed: "chain_of_thought" as ReasoningStrategy,
        steps: parsed.steps,
        evidence: perception.entities.map((e) => `Entity: ${e.name} (${e.type})`),
        alternativeConclusions: [],
        trace: parsed.steps.map((s: { stepId: number }) => `Step ${s.stepId}: LLM chain-of-thought`),
      });
    } catch {
      return null;
    }
  }

  /** LLM-powered ReAct: multi-turn reason-act loop. */
  private async llmReact(perception: PerceptionResult): Promise<ReasoningResult | null> {
    let tools: Awaited<ReturnType<IMCPManager["discoverCapabilities"]>> = [];
    try {
      tools = await this.mcp.discoverCapabilities();
    } catch {
      // proceed without tools
    }

    const toolList = tools.map((t) => t.name).join(", ");
    const steps: ReasoningStep[] = [];
    const trace: string[] = [];

    // Initial thought
    const thought = await this.llmChat([
      {
        role: "system",
        content: `You are a ReAct agent. Available tools: [${toolList}]. Given the user request, generate a thought about what action to take. Return JSON: {"thought": string, "action": string|null, "confidence": number}`,
      },
      {
        role: "user",
        content: `Intent: ${perception.intent}. Entities: ${perception.entities.map((e) => e.name).join(", ")}`,
      },
    ], { temperature: 0.3 });

    if (!thought) return null;
    try {
      const parsed = JSON.parse(thought);
      steps.push({
        stepId: 1,
        thought: parsed.thought,
        action: parsed.action ?? undefined,
        confidence: parsed.confidence ?? 0.7,
      });
      trace.push("Step 1: LLM ReAct thought");
    } catch {
      return null;
    }

    // Observation step
    steps.push({
      stepId: 2,
      thought: `Available tools: ${tools.length}. Synthesizing approach.`,
      observation: `Tools: ${toolList}`,
      confidence: 0.8,
    });
    trace.push("Step 2: Tool observation");

    const avgConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;
    return ReasoningResultSchema.parse({
      conclusion: `ReAct analysis: ${steps[0].thought}`,
      confidence: avgConfidence,
      strategyUsed: "react" as ReasoningStrategy,
      steps,
      evidence: [`Available tools: ${tools.length}`],
      alternativeConclusions: [],
      trace,
    });
  }

  /** LLM-powered internal debate with 3 personas + synthesis. */
  private async llmInternalDebate(perception: PerceptionResult): Promise<ReasoningResult | null> {
    const personas = [
      { name: "pragmatic", prompt: "Argue from a pragmatic, efficiency-focused perspective." },
      { name: "thorough", prompt: "Argue from a thorough, detail-oriented perspective." },
      { name: "creative", prompt: "Argue from a creative, unconventional perspective." },
    ];

    const steps: ReasoningStep[] = [];
    const trace: string[] = [];
    const alternativeConclusions: string[] = [];
    const arguments_: string[] = [];

    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];
      const content = await this.llmChat([
        { role: "system", content: `${persona.prompt} Return JSON: {"argument": string, "confidence": number}` },
        { role: "user", content: `Request intent: ${perception.intent}, complexity: ${perception.complexity}` },
      ], { temperature: 0.5 });

      if (!content) return null;
      try {
        const parsed = JSON.parse(content);
        steps.push({
          stepId: i + 1,
          thought: parsed.argument,
          action: `argue_${persona.name}`,
          confidence: parsed.confidence ?? 0.7,
        });
        trace.push(`Step ${i + 1}: ${persona.name} perspective (LLM)`);
        alternativeConclusions.push(`[${persona.name}] ${parsed.argument}`);
        arguments_.push(parsed.argument);
      } catch {
        return null;
      }
    }

    // Synthesis
    const synthesis = await this.llmChat([
      { role: "system", content: "Synthesize these 3 debate perspectives into a balanced conclusion. Return JSON: {\"conclusion\": string, \"confidence\": number}" },
      { role: "user", content: arguments_.map((a, i) => `${personas[i].name}: ${a}`).join("\n") },
    ], { temperature: 0.3 });

    if (!synthesis) return null;
    try {
      const parsed = JSON.parse(synthesis);
      steps.push({
        stepId: 4,
        thought: `Synthesis: ${parsed.conclusion}`,
        confidence: parsed.confidence ?? 0.8,
      });
      trace.push("Step 4: LLM synthesis");

      const avgConfidence = steps.reduce((s, st) => s + st.confidence, 0) / steps.length;
      return ReasoningResultSchema.parse({
        conclusion: parsed.conclusion,
        confidence: avgConfidence,
        strategyUsed: "internal_debate" as ReasoningStrategy,
        steps,
        evidence: [],
        alternativeConclusions,
        trace,
      });
    } catch {
      return null;
    }
  }

  /** Detect contradictions between reasoning steps. */
  private detectContradictions(steps: ReasoningStep[]): boolean {
    // Simple heuristic: check for large confidence swings between adjacent steps
    for (let i = 1; i < steps.length; i++) {
      const diff = Math.abs(steps[i].confidence - steps[i - 1].confidence);
      if (diff > 0.3) return true;
    }
    return false;
  }
}
