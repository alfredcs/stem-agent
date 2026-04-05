import type {
  IStemAgent,
  IMCPManager,
  IMemoryManager,
  AgentMessage,
  AgentResponse,
  MCPTool,
  AgentCard,
  BehaviorParameters,
  CallerProfile,
  PerceptionResult,
} from "@stem-agent/shared";
import {
  AgentResponseSchema,
  AgentCardSchema,
  BehaviorParametersSchema,
} from "@stem-agent/shared";
import { createLogger, type Logger } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";
import type { AgentCoreConfig } from "./config.js";
import { PerceptionEngine } from "./perception/index.js";
import { ReasoningEngine } from "./reasoning/index.js";
import { PlanningEngine } from "./planning/index.js";
import { ExecutionEngine } from "./execution/index.js";
import type { Principal } from "@stem-agent/shared";
import type { ILLMClient } from "./llm/index.js";
import { AnthropicLLMClient, NoOpLLMClient, CostGuardrail } from "./llm/index.js";
import { SkillManager, InMemorySkillRegistry } from "./skills/index.js";
import { UtilityTracker } from "@stem-agent/memory-system";

/**
 * StemAgent — the main agent orchestrator.
 *
 * Implements `IStemAgent` and wires the four engines together:
 * Perception -> Reasoning -> Planning -> Execution.
 *
 * All external capabilities are accessed through the injected
 * `IMCPManager` and `IMemoryManager` interfaces.
 */
export class StemAgent implements IStemAgent {
  private readonly config: AgentCoreConfig;
  private readonly mcp: IMCPManager;
  private readonly memoryManager: IMemoryManager;
  private readonly perception: PerceptionEngine;
  private readonly reasoning: ReasoningEngine;
  private readonly planning: PlanningEngine;
  private readonly execution: ExecutionEngine;
  private readonly skillManager: SkillManager;
  private readonly log: Logger;
  private readonly behavior: BehaviorParameters;
  private readonly costGuardrail: CostGuardrail;
  private readonly utilityTracker: UtilityTracker;

  private tools: MCPTool[] = [];
  private toolNames: string[] = [];
  private initialized = false;

  constructor(
    config: AgentCoreConfig,
    mcpManager: IMCPManager,
    memoryManager: IMemoryManager,
  ) {
    this.config = config;
    this.mcp = mcpManager;
    this.memoryManager = memoryManager;
    this.log = createLogger("stem-agent");

    this.behavior = BehaviorParametersSchema.parse({});

    // Create LLM client based on config (which reads from env vars).
    // Provider priority: LLM_PROVIDER env > config default (amazon_bedrock).
    // Falls back to NoOpLLMClient when no credentials are available.
    const llmConfig = config.agent.llm;
    let llmClient: ILLMClient;

    const hasCredentials =
      llmConfig.provider === "amazon_bedrock"
        ? !!process.env.AWS_ACCESS_KEY_ID || !!process.env.AWS_PROFILE
            || !!process.env.AWS_REGION || !!process.env.AWS_DEFAULT_REGION
        : llmConfig.provider === "anthropic"
          ? !!process.env.ANTHROPIC_API_KEY
          : false;

    if (hasCredentials) {
      llmClient = new AnthropicLLMClient(llmConfig);
    } else {
      llmClient = new NoOpLLMClient();
    }

    const isNoOp = llmClient instanceof NoOpLLMClient;
    const activeLlm = isNoOp ? undefined : llmClient;

    this.costGuardrail = new CostGuardrail(config.agent.cost);
    this.utilityTracker = new UtilityTracker();

    this.perception = new PerceptionEngine(memoryManager, activeLlm, llmConfig.models.perception);
    this.reasoning = new ReasoningEngine(mcpManager, memoryManager, config, activeLlm, this.costGuardrail);
    this.planning = new PlanningEngine(memoryManager, config, activeLlm);
    this.execution = new ExecutionEngine(mcpManager, memoryManager, config, activeLlm);
    this.skillManager = new SkillManager(new InMemorySkillRegistry(), memoryManager);
  }

  /** Initialize the agent: connect MCP servers and discover tools. */
  async initialize(): Promise<void> {
    this.log.info("Initializing StemAgent");
    await this.mcp.connectAll();
    this.tools = await this.mcp.discoverCapabilities();
    this.toolNames = this.tools.map((t) => t.name);
    this.initialized = true;
    this.log.info({ toolCount: this.tools.length }, "StemAgent initialized");
  }

  /** Gracefully shutdown the agent. */
  async shutdown(): Promise<void> {
    this.log.info("Shutting down StemAgent");
    await this.mcp.shutdown();
    await this.memoryManager.shutdown();
    this.initialized = false;
    this.log.info("StemAgent shut down");
  }

  /**
   * Process a message through the full pipeline:
   * Perceive -> Adapt -> Reason -> Plan -> Execute -> Learn.
   */
  async process(
    taskId: string,
    message: AgentMessage,
    _principal?: Principal | null,
  ): Promise<AgentResponse> {
    this.log.info({ taskId }, "Processing message");
    this.costGuardrail.resetInteraction();

    try {
      // Phase 1: Perception
      const perception = await this.perception.perceive(message, this.toolNames);

      // Phase 2: Adapt — tune behavior from caller profile
      const callerId = message.callerId ?? "anonymous";
      const callerProfile = await this.memoryManager.getCallerProfile(callerId);
      const adaptedBehavior = this.adapt(perception, callerProfile);

      // Phase 3: Skill check — try to short-circuit via acquired skills
      const matchedSkills = await this.skillManager.matchSkills(perception);
      let usedSkillId: string | undefined;

      let reasoningResult;
      let plan;

      if (matchedSkills.length > 0 && matchedSkills[0].maturity !== "progenitor") {
        // Use the best matching committed/mature skill
        const skill = matchedSkills[0];
        usedSkillId = skill.id;
        this.log.info({ skillName: skill.name, maturity: skill.maturity }, "Using acquired skill");

        plan = this.skillManager.skillToPlan(skill, String(message.content ?? ""));
        reasoningResult = {
          conclusion: `Skill "${skill.name}" activated`,
          confidence: skill.successRate,
          strategyUsed: "react" as const,
          steps: [],
          evidence: [],
          alternativeConclusions: [],
          trace: [`Skill match: ${skill.name} (${skill.maturity}, ${(skill.successRate * 100).toFixed(0)}% success)`],
        };
      } else {
        // Normal pipeline: Reason → Plan
        reasoningResult = await this.reasoning.reason(perception, adaptedBehavior);
        plan = await this.planning.createPlan(reasoningResult, this.tools, adaptedBehavior);
      }

      // Phase 4: Execution
      const executionResult = await this.execution.execute(plan, adaptedBehavior, String(message.content ?? ""));

      // Format response
      const response = AgentResponseSchema.parse({
        id: randomUUID(),
        status: executionResult.success ? "completed" : "failed",
        content: executionResult.finalResult ?? reasoningResult.conclusion,
        contentType: "text/plain",
        reasoningTrace: reasoningResult.trace,
        metadata: {
          taskId,
          strategy: reasoningResult.strategyUsed,
          confidence: reasoningResult.confidence,
          stepsExecuted: executionResult.stepResults.length,
          skillUsed: usedSkillId,
        },
      });

      // LEARN phase (async, non-blocking)
      // 1. Store episode
      this.storeEpisode(taskId, message, response).catch((err) => {
        this.log.warn({ err }, "Failed to store episode");
      });

      // 2. Update caller profile
      if (message.callerId) {
        this.memoryManager.updateCallerProfile(message.callerId, perception.callerStyleSignals).catch((err) => {
          this.log.warn({ err }, "Failed to update caller profile");
        });
      }

      // 3. Record skill outcome (maturation / apoptosis)
      if (usedSkillId) {
        this.skillManager.recordOutcome(usedSkillId, executionResult.success).catch((err) => {
          this.log.warn({ err }, "Failed to record skill outcome");
        });
      }

      // 4. Try crystallizing new skills from accumulated patterns
      this.skillManager.tryCrystallize().catch((err) => {
        this.log.warn({ err }, "Skill crystallization failed");
      });

      // 5. ATLAS utility feedback — update utility for retrieved memories
      const reward = UtilityTracker.statusToReward(response.status);
      this.utilityTracker.recordReward(reward);
      const retrievedIds = (perception.context as Record<string, unknown>).retrievedMemoryIds as string[] | undefined;
      if (retrievedIds && retrievedIds.length > 0) {
        this.updateRetrievedUtilities(retrievedIds, reward).catch((err) => {
          this.log.warn({ err }, "Failed to update memory utilities");
        });
      }

      // 6. Experience distillation — significant outcomes get immediately distilled
      if (this.utilityTracker.isSignificant(reward)) {
        this.distillExperience(taskId, message, perception, response).catch((err) => {
          this.log.warn({ err }, "Experience distillation failed");
        });
      }

      return response;
    } catch (err) {
      this.log.error({ err, taskId }, "Pipeline error");

      return AgentResponseSchema.parse({
        id: randomUUID(),
        status: "failed",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        contentType: "text/plain",
        metadata: { taskId, error: true },
      });
    }
  }

  /**
   * Stream partial responses after each pipeline phase.
   * Yields an AgentResponse after Perception, Reasoning, Planning,
   * and Execution.
   */
  async *stream(
    taskId: string,
    message: AgentMessage,
  ): AsyncIterable<AgentResponse> {
    try {
      // Phase 1: Perception
      const perception = await this.perception.perceive(message, this.toolNames);
      yield AgentResponseSchema.parse({
        id: randomUUID(),
        status: "in_progress",
        content: `Perceived: intent="${perception.intent}", complexity="${perception.complexity}"`,
        metadata: { taskId, phase: "perception" },
      });

      // Phase 2: Adapt
      const callerId = message.callerId ?? "anonymous";
      const callerProfile = await this.memoryManager.getCallerProfile(callerId);
      const adaptedBehavior = this.adapt(perception, callerProfile);

      // Phase 3: Skill check
      const matchedSkills = await this.skillManager.matchSkills(perception);
      let usedSkillId: string | undefined;
      let reasoningResult;
      let plan;

      if (matchedSkills.length > 0 && matchedSkills[0].maturity !== "progenitor") {
        const skill = matchedSkills[0];
        usedSkillId = skill.id;
        plan = this.skillManager.skillToPlan(skill, String(message.content ?? ""));
        reasoningResult = {
          conclusion: `Skill "${skill.name}" activated`,
          confidence: skill.successRate,
          strategyUsed: "react" as const,
          steps: [],
          evidence: [],
          alternativeConclusions: [],
          trace: [`Skill match: ${skill.name} (${skill.maturity})`],
        };
        yield AgentResponseSchema.parse({
          id: randomUUID(),
          status: "in_progress",
          content: `Skill activated: "${skill.name}" (${skill.maturity}, ${(skill.successRate * 100).toFixed(0)}% success)`,
          metadata: { taskId, phase: "skill_match" },
        });
      } else {
        reasoningResult = await this.reasoning.reason(perception, adaptedBehavior);
        yield AgentResponseSchema.parse({
          id: randomUUID(),
          status: "in_progress",
          content: `Reasoned: strategy="${reasoningResult.strategyUsed}", confidence=${reasoningResult.confidence.toFixed(2)}`,
          metadata: { taskId, phase: "reasoning" },
        });

        plan = await this.planning.createPlan(reasoningResult, this.tools, adaptedBehavior);
        yield AgentResponseSchema.parse({
          id: randomUUID(),
          status: "in_progress",
          content: `Planned: ${plan.steps.length} steps in ${plan.parallelGroups.length} groups`,
          metadata: { taskId, phase: "planning" },
        });
      }

      // Phase 4: Execution
      const executionResult = await this.execution.execute(plan, adaptedBehavior, String(message.content ?? ""));
      yield AgentResponseSchema.parse({
        id: randomUUID(),
        status: executionResult.success ? "completed" : "failed",
        content: executionResult.finalResult ?? reasoningResult.conclusion,
        reasoningTrace: reasoningResult.trace,
        metadata: { taskId, phase: "execution", skillUsed: usedSkillId },
      });

      // LEARN phase
      if (message.callerId) {
        this.memoryManager.updateCallerProfile(message.callerId, perception.callerStyleSignals).catch((err) => {
          this.log.warn({ err }, "Failed to update caller profile");
        });
      }
      if (usedSkillId) {
        this.skillManager.recordOutcome(usedSkillId, executionResult.success).catch((err) => {
          this.log.warn({ err }, "Failed to record skill outcome");
        });
      }
      this.skillManager.tryCrystallize().catch((err) => {
        this.log.warn({ err }, "Skill crystallization failed");
      });

      // ATLAS utility feedback — update utility for retrieved memories
      const finalStatus = executionResult.success ? "completed" : "failed";
      const reward = UtilityTracker.statusToReward(finalStatus);
      this.utilityTracker.recordReward(reward);
      const retrievedIds = (perception.context as Record<string, unknown>).retrievedMemoryIds as string[] | undefined;
      if (retrievedIds && retrievedIds.length > 0) {
        this.updateRetrievedUtilities(retrievedIds, reward).catch((err) => {
          this.log.warn({ err }, "Failed to update memory utilities");
        });
      }

      // Experience distillation — significant outcomes get immediately distilled
      if (this.utilityTracker.isSignificant(reward)) {
        const streamResponse = AgentResponseSchema.parse({
          id: randomUUID(),
          status: finalStatus,
          content: executionResult.finalResult ?? reasoningResult.conclusion,
          metadata: { taskId },
        });
        this.distillExperience(taskId, message, perception, streamResponse).catch((err) => {
          this.log.warn({ err }, "Experience distillation failed");
        });
      }
    } catch (err) {
      yield AgentResponseSchema.parse({
        id: randomUUID(),
        status: "failed",
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        metadata: { taskId, error: true },
      });
    }
  }

  /** Access the skill manager for plugin registration/removal. */
  getSkillManager(): SkillManager {
    return this.skillManager;
  }

  /** Return the agent card describing this agent's capabilities. */
  getAgentCard(): AgentCard {
    const agentConf = this.config.agent.agent;
    return AgentCardSchema.parse({
      agentId: agentConf.agentId,
      name: agentConf.name,
      description: agentConf.description,
      version: agentConf.version,
      endpoint: `http://${this.config.agent.server.host}:${this.config.agent.server.port}`,
      skills: this.tools.map((t) => ({
        id: t.name,
        name: t.name,
        description: t.description,
      })),
    });
  }

  /** Adapt behavior parameters based on caller profile and perception. */
  private adapt(perception: PerceptionResult, profile: CallerProfile): BehaviorParameters {
    return BehaviorParametersSchema.parse({
      verbosityLevel: profile.style.verbosity,
      reasoningDepth: Math.max(1, Math.round(profile.style.technicalDepth * 6)),
      toolUsePreference: profile.philosophy.pragmatismVsIdealism,
      creativityLevel: profile.philosophy.innovationOrientation,
      explorationVsExploitation: profile.philosophy.riskTolerance,
      confidenceThreshold: perception.complexity === "complex"
        ? 0.5
        : perception.urgency === "high"
          ? 0.6
          : 0.7,
      proactiveSuggestion: true,
      selfReflectionFrequency: 5,
      maxPlanSteps: 10,
      memoryRetrievalBreadth: 10,
    });
  }

  /** Update utility scores for all retrieved memories based on outcome reward. */
  private async updateRetrievedUtilities(ids: string[], reward: number): Promise<void> {
    for (const id of ids) {
      try {
        await this.memoryManager.updateEpisodeUtility(id, reward);
      } catch {
        // Not an episode — try as knowledge triple
        try {
          await this.memoryManager.updateKnowledgeUtility(id, reward);
        } catch (err) {
          this.log.warn({ err, id }, "Failed to update utility for memory");
        }
      }
    }
  }

  /**
   * Distill a significant experience into a KnowledgeTriple immediately.
   * Captures outlier successes/failures in real-time without waiting for
   * periodic consolidation.
   */
  private async distillExperience(
    taskId: string,
    message: AgentMessage,
    perception: PerceptionResult,
    response: AgentResponse,
  ): Promise<void> {
    const reward = UtilityTracker.statusToReward(response.status);
    const subject = message.callerId ?? "agent";
    const predicate = perception.intent;
    const object = response.status === "completed"
      ? `successfully handled ${perception.complexity} ${perception.intent}`
      : `failed ${perception.complexity} ${perception.intent}`;

    await this.memoryManager.storeKnowledge({
      id: randomUUID(),
      subject,
      predicate,
      object,
      confidence: Math.abs(reward),
      source: "experience_distillation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      utility: reward > 0 ? reward : 0,
      sourceCount: 1,
      retrievalCount: 0,
    });

    this.log.debug({ taskId, intent: perception.intent, reward }, "experience distilled");
  }

  /** Store an episode in episodic memory. */
  private async storeEpisode(
    taskId: string,
    message: AgentMessage,
    response: AgentResponse,
  ): Promise<void> {
    await this.memoryManager.remember({
      id: randomUUID(),
      timestamp: Date.now(),
      actors: [message.callerId ?? "unknown"],
      actions: ["process"],
      context: { taskId },
      outcome: response.status,
      importance: response.status === "completed" ? 0.5 : 0.7,
      summary: `Task ${taskId}: ${response.status}`,
    });
  }
}
