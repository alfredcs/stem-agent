import { AgentResponseSchema, AgentCardSchema, BehaviorParametersSchema, } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import { randomUUID } from "node:crypto";
import { PerceptionEngine } from "./perception/index.js";
import { ReasoningEngine } from "./reasoning/index.js";
import { PlanningEngine } from "./planning/index.js";
import { ExecutionEngine } from "./execution/index.js";
import { AnthropicLLMClient, NoOpLLMClient, CostGuardrail } from "./llm/index.js";
import { SkillManager, InMemorySkillRegistry } from "./skills/index.js";
import { UtilityTracker } from "@stem-agent/memory-system";
// ---------------------------------------------------------------------------
// Caller-profile confidence gating (design doc Sec 7.3)
// ---------------------------------------------------------------------------
/** Below this interaction count the profile is considered unreliable. */
const MIN_INTERACTIONS_FOR_TRUST = 5;
/** Below this confidence the agent falls back to current-message signals. */
const CONFIDENCE_FOR_PROFILE = 0.5;
/**
 * StemAgent — the main agent orchestrator.
 *
 * Implements `IStemAgent` and wires the four engines together:
 * Perception -> Reasoning -> Planning -> Execution.
 *
 * All external capabilities are accessed through the injected
 * `IMCPManager` and `IMemoryManager` interfaces.
 */
export class StemAgent {
    config;
    mcp;
    memoryManager;
    perception;
    reasoning;
    planning;
    execution;
    skillManager;
    log;
    behavior;
    costGuardrail;
    utilityTracker;
    persona;
    tools = [];
    toolNames = [];
    initialized = false;
    constructor(config, mcpManager, memoryManager, persona) {
        this.config = config;
        this.mcp = mcpManager;
        this.memoryManager = memoryManager;
        this.persona = persona;
        this.log = createLogger("stem-agent");
        this.behavior = BehaviorParametersSchema.parse({});
        // Create LLM client based on config (which reads from env vars).
        // Provider priority: LLM_PROVIDER env > config default (amazon_bedrock).
        // Falls back to NoOpLLMClient when no credentials are available.
        const llmConfig = config.agent.llm;
        let llmClient;
        const hasCredentials = llmConfig.provider === "amazon_bedrock"
            ? !!process.env.AWS_ACCESS_KEY_ID || !!process.env.AWS_PROFILE
                || !!process.env.AWS_REGION || !!process.env.AWS_DEFAULT_REGION
            : llmConfig.provider === "anthropic"
                ? !!process.env.ANTHROPIC_API_KEY
                : false;
        if (hasCredentials) {
            llmClient = new AnthropicLLMClient(llmConfig);
        }
        else {
            llmClient = new NoOpLLMClient();
        }
        const isNoOp = llmClient instanceof NoOpLLMClient;
        const activeLlm = isNoOp ? undefined : llmClient;
        this.costGuardrail = new CostGuardrail(config.agent.cost);
        this.utilityTracker = new UtilityTracker();
        this.perception = new PerceptionEngine(memoryManager, activeLlm, llmConfig.models.perception, persona?.systemPrompt);
        this.reasoning = new ReasoningEngine(mcpManager, memoryManager, config, activeLlm, this.costGuardrail, persona?.systemPrompt);
        this.planning = new PlanningEngine(memoryManager, config, activeLlm, persona?.systemPrompt);
        this.execution = new ExecutionEngine(mcpManager, memoryManager, config, activeLlm);
        this.skillManager = new SkillManager(new InMemorySkillRegistry(), memoryManager);
    }
    /** Access the domain persona (if differentiated). */
    getPersona() {
        return this.persona;
    }
    /** Initialize the agent: connect MCP servers and discover tools. */
    async initialize() {
        this.log.info("Initializing StemAgent");
        await this.mcp.connectAll();
        this.tools = await this.mcp.discoverCapabilities();
        this.toolNames = this.tools.map((t) => t.name);
        this.initialized = true;
        this.log.info({ toolCount: this.tools.length }, "StemAgent initialized");
    }
    /** Gracefully shutdown the agent. */
    async shutdown() {
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
    async process(taskId, message, _principal) {
        this.log.info({ taskId }, "Processing message");
        this.costGuardrail.resetInteraction();
        try {
            // Phase 1: Perception
            const perception = await this.perception.perceive(message, this.toolNames);
            // Phase 1b: Persona guardrails — refuse disallowed intents / forbidden topics
            const refusal = this.checkPersonaGuardrails(perception, message);
            if (refusal) {
                return AgentResponseSchema.parse({
                    id: randomUUID(),
                    status: "failed",
                    content: refusal.content,
                    contentType: "text/plain",
                    metadata: { taskId, refusal: refusal.reason, persona: this.persona?.name },
                });
            }
            // Phase 2: Adapt — tune behavior from caller profile + persona overrides
            const callerId = message.callerId ?? "anonymous";
            const callerProfile = await this.memoryManager.getCallerProfile(callerId);
            const adaptedBehavior = this.adapt(perception, callerProfile);
            // Phase 3: Skill check — try to short-circuit via acquired skills
            const matchedSkills = await this.skillManager.matchSkills(perception);
            let usedSkillId;
            let reasoningResult;
            let plan;
            const scopedTools = this.filterToolsByPersona(this.tools);
            if (matchedSkills.length > 0 && matchedSkills[0].maturity !== "progenitor") {
                // Use the best matching committed/mature skill
                const skill = matchedSkills[0];
                usedSkillId = skill.id;
                this.log.info({ skillName: skill.name, maturity: skill.maturity }, "Using acquired skill");
                plan = this.skillManager.skillToPlan(skill, String(message.content ?? ""));
                reasoningResult = {
                    conclusion: `Skill "${skill.name}" activated`,
                    confidence: skill.successRate,
                    strategyUsed: "react",
                    steps: [],
                    evidence: [],
                    alternativeConclusions: [],
                    trace: [`Skill match: ${skill.name} (${skill.maturity}, ${(skill.successRate * 100).toFixed(0)}% success)`],
                };
            }
            else {
                // Normal pipeline: Reason → Plan
                reasoningResult = await this.reasoning.reason(perception, adaptedBehavior, this.persona?.preferredStrategy);
                plan = await this.planning.createPlan(reasoningResult, scopedTools, adaptedBehavior);
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
            // 1. Store episode (with rich actions for meaningful crystallization)
            const executedToolNames = plan.steps
                .map((s) => s.toolName)
                .filter((n) => typeof n === "string");
            this.storeEpisode(taskId, message, response, perception, executedToolNames).catch((err) => {
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
            const retrievedIds = perception.context.retrievedMemoryIds;
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
        }
        catch (err) {
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
    async *stream(taskId, message) {
        try {
            // Phase 1: Perception
            const perception = await this.perception.perceive(message, this.toolNames);
            yield AgentResponseSchema.parse({
                id: randomUUID(),
                status: "in_progress",
                content: `Perceived: intent="${perception.intent}", complexity="${perception.complexity}"`,
                metadata: { taskId, phase: "perception" },
            });
            // Phase 1b: Persona guardrails
            const refusal = this.checkPersonaGuardrails(perception, message);
            if (refusal) {
                yield AgentResponseSchema.parse({
                    id: randomUUID(),
                    status: "failed",
                    content: refusal.content,
                    metadata: { taskId, phase: "refusal", refusal: refusal.reason, persona: this.persona?.name },
                });
                return;
            }
            // Phase 2: Adapt
            const callerId = message.callerId ?? "anonymous";
            const callerProfile = await this.memoryManager.getCallerProfile(callerId);
            const adaptedBehavior = this.adapt(perception, callerProfile);
            // Phase 3: Skill check
            const matchedSkills = await this.skillManager.matchSkills(perception);
            let usedSkillId;
            let reasoningResult;
            let plan;
            const scopedTools = this.filterToolsByPersona(this.tools);
            if (matchedSkills.length > 0 && matchedSkills[0].maturity !== "progenitor") {
                const skill = matchedSkills[0];
                usedSkillId = skill.id;
                plan = this.skillManager.skillToPlan(skill, String(message.content ?? ""));
                reasoningResult = {
                    conclusion: `Skill "${skill.name}" activated`,
                    confidence: skill.successRate,
                    strategyUsed: "react",
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
            }
            else {
                reasoningResult = await this.reasoning.reason(perception, adaptedBehavior, this.persona?.preferredStrategy);
                yield AgentResponseSchema.parse({
                    id: randomUUID(),
                    status: "in_progress",
                    content: `Reasoned: strategy="${reasoningResult.strategyUsed}", confidence=${reasoningResult.confidence.toFixed(2)}`,
                    metadata: { taskId, phase: "reasoning" },
                });
                plan = await this.planning.createPlan(reasoningResult, scopedTools, adaptedBehavior);
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
            const retrievedIds = perception.context.retrievedMemoryIds;
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
        }
        catch (err) {
            yield AgentResponseSchema.parse({
                id: randomUUID(),
                status: "failed",
                content: `Error: ${err instanceof Error ? err.message : String(err)}`,
                metadata: { taskId, error: true },
            });
        }
    }
    /** Access the skill manager for plugin registration/removal. */
    getSkillManager() {
        return this.skillManager;
    }
    /** Return the agent card describing this agent's capabilities. */
    getAgentCard() {
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
    /**
     * Adapt behavior parameters based on caller profile, perception, and persona.
     *
     * Layers (lowest → highest precedence):
     *   1. Defaults from BehaviorParametersSchema.
     *   2. Caller-profile signals (only when profile is trusted — see
     *      MIN_INTERACTIONS_FOR_TRUST / CONFIDENCE_FOR_PROFILE). For untrusted
     *      profiles, fall back to perception.callerStyleSignals so the agent
     *      behaves as undifferentiated rather than pinned to 0.5 defaults.
     *   3. Persona defaultBehavior overrides (strongest — differentiates the
     *      agent regardless of caller).
     */
    adapt(perception, profile) {
        const trusted = profile.totalInteractions >= MIN_INTERACTIONS_FOR_TRUST &&
            profile.confidence >= CONFIDENCE_FOR_PROFILE;
        const signals = perception.callerStyleSignals ?? {};
        const pick = (profileValue, signalKey, fallback) => {
            if (trusted)
                return profileValue;
            const s = signals[signalKey];
            return typeof s === "number" ? s : fallback;
        };
        const base = {
            verbosityLevel: pick(profile.style.verbosity, "verbosity", 0.5),
            reasoningDepth: Math.max(1, Math.round(pick(profile.style.technicalDepth, "technicalDepth", 0.5) * 6)),
            toolUsePreference: trusted ? profile.philosophy.pragmatismVsIdealism : 0.5,
            creativityLevel: trusted ? profile.philosophy.innovationOrientation : 0.5,
            explorationVsExploitation: trusted ? profile.philosophy.riskTolerance : 0.3,
            confidenceThreshold: perception.complexity === "complex"
                ? 0.5
                : perception.urgency === "high"
                    ? 0.6
                    : 0.7,
            proactiveSuggestion: true,
            selfReflectionFrequency: 5,
            maxPlanSteps: 10,
            memoryRetrievalBreadth: 10,
        };
        // Persona overrides take precedence over everything else.
        const personaOverrides = this.persona?.defaultBehavior ?? {};
        return BehaviorParametersSchema.parse({ ...base, ...personaOverrides });
    }
    /**
     * Check persona-defined scope and safety boundaries. Returns a refusal
     * object if the message must be rejected, otherwise null.
     */
    checkPersonaGuardrails(perception, message) {
        const persona = this.persona;
        if (!persona)
            return null;
        if (persona.allowedIntents.length > 0 && !persona.allowedIntents.includes(perception.intent)) {
            this.log.info({ persona: persona.name, intent: perception.intent }, "Refusing: intent not in allowedIntents");
            return {
                content: `Sorry — I can't handle this request. The ${persona.name} agent is scoped to: ${persona.allowedIntents.join(", ")}.`,
                reason: "intent_not_allowed",
            };
        }
        if (persona.forbiddenTopics.length > 0) {
            const content = String(message.content ?? "").toLowerCase();
            const hit = persona.forbiddenTopics.find((t) => content.includes(t.toLowerCase()));
            if (hit) {
                this.log.info({ persona: persona.name, topic: hit }, "Refusing: forbidden topic");
                return {
                    content: `Sorry — I can't discuss "${hit}". This falls outside the compliance scope of the ${persona.name} agent.`,
                    reason: "forbidden_topic",
                };
            }
        }
        return null;
    }
    /**
     * Filter discovered tools to only those the persona allows. Empty allowlist
     * means "all discovered tools are permitted" (the generic-agent default).
     */
    filterToolsByPersona(tools) {
        const allowlist = this.persona?.toolAllowlist ?? [];
        if (allowlist.length === 0)
            return tools;
        const allow = new Set(allowlist);
        return tools.filter((t) => allow.has(t.name));
    }
    /** Update utility scores for all retrieved memories based on outcome reward. */
    async updateRetrievedUtilities(ids, reward) {
        for (const id of ids) {
            try {
                await this.memoryManager.updateEpisodeUtility(id, reward);
            }
            catch {
                // Not an episode — try as knowledge triple
                try {
                    await this.memoryManager.updateKnowledgeUtility(id, reward);
                }
                catch (err) {
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
    async distillExperience(taskId, message, perception, response) {
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
    /**
     * Store an episode in episodic memory.
     *
     * `actions` is intentionally rich so the crystallization detector
     * (SkillManager.detectPatterns) can group episodes by meaningful
     * signatures. A single "process" token collapses everything into one
     * bucket and prevents useful skill discovery.
     */
    async storeEpisode(taskId, message, response, perception, toolNames) {
        const actions = [];
        if (perception?.intent)
            actions.push(`intent:${perception.intent}`);
        if (toolNames && toolNames.length > 0) {
            for (const name of toolNames)
                actions.push(`tool:${name}`);
        }
        if (actions.length === 0)
            actions.push("process");
        await this.memoryManager.remember({
            id: randomUUID(),
            timestamp: Date.now(),
            actors: [message.callerId ?? "unknown"],
            actions,
            context: {
                taskId,
                intent: perception?.intent,
                domain: perception?.domain,
                complexity: perception?.complexity,
                persona: this.persona?.name,
            },
            outcome: response.status,
            importance: response.status === "completed" ? 0.5 : 0.7,
            summary: `Task ${taskId}: ${response.status}`,
        });
    }
}
//# sourceMappingURL=orchestrator.js.map