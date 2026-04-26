import type { IStemAgent, IMCPManager, IMemoryManager, AgentMessage, AgentResponse, AgentCard, DomainPersona } from "@stem-agent/shared";
import type { AgentCoreConfig } from "./config.js";
import type { Principal } from "@stem-agent/shared";
import { SkillManager } from "./skills/index.js";
/**
 * StemAgent — the main agent orchestrator.
 *
 * Implements `IStemAgent` and wires the four engines together:
 * Perception -> Reasoning -> Planning -> Execution.
 *
 * All external capabilities are accessed through the injected
 * `IMCPManager` and `IMemoryManager` interfaces.
 */
export declare class StemAgent implements IStemAgent {
    private readonly config;
    private readonly mcp;
    private readonly memoryManager;
    private readonly perception;
    private readonly reasoning;
    private readonly planning;
    private readonly execution;
    private readonly skillManager;
    private readonly log;
    private readonly behavior;
    private readonly costGuardrail;
    private readonly utilityTracker;
    private readonly persona?;
    private tools;
    private toolNames;
    private initialized;
    constructor(config: AgentCoreConfig, mcpManager: IMCPManager, memoryManager: IMemoryManager, persona?: DomainPersona);
    /** Access the domain persona (if differentiated). */
    getPersona(): DomainPersona | undefined;
    /** Initialize the agent: connect MCP servers and discover tools. */
    initialize(): Promise<void>;
    /** Gracefully shutdown the agent. */
    shutdown(): Promise<void>;
    /**
     * Process a message through the full pipeline:
     * Perceive -> Adapt -> Reason -> Plan -> Execute -> Learn.
     */
    process(taskId: string, message: AgentMessage, _principal?: Principal | null): Promise<AgentResponse>;
    /**
     * Stream partial responses after each pipeline phase.
     * Yields an AgentResponse after Perception, Reasoning, Planning,
     * and Execution.
     */
    stream(taskId: string, message: AgentMessage): AsyncIterable<AgentResponse>;
    /** Access the skill manager for plugin registration/removal. */
    getSkillManager(): SkillManager;
    /** Return the agent card describing this agent's capabilities. */
    getAgentCard(): AgentCard;
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
    private adapt;
    /**
     * Check persona-defined scope and safety boundaries. Returns a refusal
     * object if the message must be rejected, otherwise null.
     */
    private checkPersonaGuardrails;
    /**
     * Filter discovered tools to only those the persona allows. Empty allowlist
     * means "all discovered tools are permitted" (the generic-agent default).
     */
    private filterToolsByPersona;
    /** Update utility scores for all retrieved memories based on outcome reward. */
    private updateRetrievedUtilities;
    /**
     * Distill a significant experience into a KnowledgeTriple immediately.
     * Captures outlier successes/failures in real-time without waiting for
     * periodic consolidation.
     */
    private distillExperience;
    /**
     * Store an episode in episodic memory.
     *
     * `actions` is intentionally rich so the crystallization detector
     * (SkillManager.detectPatterns) can group episodes by meaningful
     * signatures. A single "process" token collapses everything into one
     * bucket and prevents useful skill discovery.
     */
    private storeEpisode;
}
//# sourceMappingURL=orchestrator.d.ts.map