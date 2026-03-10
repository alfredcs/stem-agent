"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StemAgent = void 0;
const shared_1 = require("@stem-agent/shared");
const shared_2 = require("@stem-agent/shared");
const node_crypto_1 = require("node:crypto");
const index_js_1 = require("./perception/index.js");
const index_js_2 = require("./reasoning/index.js");
const index_js_3 = require("./planning/index.js");
const index_js_4 = require("./execution/index.js");
const index_js_5 = require("./llm/index.js");
/**
 * StemAgent — the main agent orchestrator.
 *
 * Implements `IStemAgent` and wires the four engines together:
 * Perception -> Reasoning -> Planning -> Execution.
 *
 * All external capabilities are accessed through the injected
 * `IMCPManager` and `IMemoryManager` interfaces.
 */
class StemAgent {
    config;
    mcp;
    memoryManager;
    perception;
    reasoning;
    planning;
    execution;
    log;
    behavior;
    costGuardrail;
    tools = [];
    toolNames = [];
    initialized = false;
    constructor(config, mcpManager, memoryManager) {
        this.config = config;
        this.mcp = mcpManager;
        this.memoryManager = memoryManager;
        this.log = (0, shared_2.createLogger)("stem-agent");
        this.behavior = shared_1.BehaviorParametersSchema.parse({});
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
            llmClient = new index_js_5.AnthropicLLMClient(llmConfig);
        }
        else {
            llmClient = new index_js_5.NoOpLLMClient();
        }
        const isNoOp = llmClient instanceof index_js_5.NoOpLLMClient;
        const activeLlm = isNoOp ? undefined : llmClient;
        this.costGuardrail = new index_js_5.CostGuardrail(config.agent.cost);
        this.perception = new index_js_1.PerceptionEngine(memoryManager, activeLlm, llmConfig.models.perception);
        this.reasoning = new index_js_2.ReasoningEngine(mcpManager, memoryManager, config, activeLlm, this.costGuardrail);
        this.planning = new index_js_3.PlanningEngine(memoryManager, config, activeLlm);
        this.execution = new index_js_4.ExecutionEngine(mcpManager, memoryManager, config);
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
            // Phase 2: Adapt — tune behavior from caller profile
            const callerId = message.callerId ?? "anonymous";
            const callerProfile = await this.memoryManager.getCallerProfile(callerId);
            const adaptedBehavior = this.adapt(perception, callerProfile);
            // Phase 3: Reasoning
            const reasoningResult = await this.reasoning.reason(perception, adaptedBehavior);
            // Phase 4: Planning
            const plan = await this.planning.createPlan(reasoningResult, this.tools, adaptedBehavior);
            // Phase 5: Execution
            const executionResult = await this.execution.execute(plan, adaptedBehavior);
            // Format response
            const response = shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: executionResult.success ? "completed" : "failed",
                content: executionResult.finalResult ?? reasoningResult.conclusion,
                contentType: "text/plain",
                reasoningTrace: reasoningResult.trace,
                metadata: {
                    taskId,
                    strategy: reasoningResult.strategyUsed,
                    confidence: reasoningResult.confidence,
                    stepsExecuted: executionResult.stepResults.length,
                },
            });
            // Non-blocking: store episode in memory
            this.storeEpisode(taskId, message, response).catch((err) => {
                this.log.warn({ err }, "Failed to store episode");
            });
            // LEARN phase: update caller profile from interaction signals
            if (message.callerId) {
                this.memoryManager.updateCallerProfile(message.callerId, perception.callerStyleSignals).catch((err) => {
                    this.log.warn({ err }, "Failed to update caller profile");
                });
            }
            return response;
        }
        catch (err) {
            this.log.error({ err, taskId }, "Pipeline error");
            return shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
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
            yield shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: "in_progress",
                content: `Perceived: intent="${perception.intent}", complexity="${perception.complexity}"`,
                metadata: { taskId, phase: "perception" },
            });
            // Phase 2: Adapt
            const callerId = message.callerId ?? "anonymous";
            const callerProfile = await this.memoryManager.getCallerProfile(callerId);
            const adaptedBehavior = this.adapt(perception, callerProfile);
            // Phase 3: Reasoning
            const reasoningResult = await this.reasoning.reason(perception, adaptedBehavior);
            yield shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: "in_progress",
                content: `Reasoned: strategy="${reasoningResult.strategyUsed}", confidence=${reasoningResult.confidence.toFixed(2)}`,
                metadata: { taskId, phase: "reasoning" },
            });
            // Phase 4: Planning
            const plan = await this.planning.createPlan(reasoningResult, this.tools, adaptedBehavior);
            yield shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: "in_progress",
                content: `Planned: ${plan.steps.length} steps in ${plan.parallelGroups.length} groups`,
                metadata: { taskId, phase: "planning" },
            });
            // Phase 5: Execution
            const executionResult = await this.execution.execute(plan, adaptedBehavior);
            yield shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: executionResult.success ? "completed" : "failed",
                content: executionResult.finalResult ?? reasoningResult.conclusion,
                reasoningTrace: reasoningResult.trace,
                metadata: { taskId, phase: "execution" },
            });
            // LEARN phase
            if (message.callerId) {
                this.memoryManager.updateCallerProfile(message.callerId, perception.callerStyleSignals).catch((err) => {
                    this.log.warn({ err }, "Failed to update caller profile");
                });
            }
        }
        catch (err) {
            yield shared_1.AgentResponseSchema.parse({
                id: (0, node_crypto_1.randomUUID)(),
                status: "failed",
                content: `Error: ${err instanceof Error ? err.message : String(err)}`,
                metadata: { taskId, error: true },
            });
        }
    }
    /** Return the agent card describing this agent's capabilities. */
    getAgentCard() {
        const agentConf = this.config.agent.agent;
        return shared_1.AgentCardSchema.parse({
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
    adapt(perception, profile) {
        return shared_1.BehaviorParametersSchema.parse({
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
    /** Store an episode in episodic memory. */
    async storeEpisode(taskId, message, response) {
        await this.memoryManager.remember({
            id: (0, node_crypto_1.randomUUID)(),
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
exports.StemAgent = StemAgent;
//# sourceMappingURL=orchestrator.js.map