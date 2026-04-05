import type { IStemAgent, IMCPManager, IMemoryManager, AgentMessage, AgentResponse, AgentCard } from "@stem-agent/shared";
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
    private tools;
    private toolNames;
    private initialized;
    constructor(config: AgentCoreConfig, mcpManager: IMCPManager, memoryManager: IMemoryManager);
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
    /** Adapt behavior parameters based on caller profile and perception. */
    private adapt;
    /** Update utility scores for all retrieved memories based on outcome reward. */
    private updateRetrievedUtilities;
    /**
     * Distill a significant experience into a KnowledgeTriple immediately.
     * Captures outlier successes/failures in real-time without waiting for
     * periodic consolidation.
     */
    private distillExperience;
    /** Store an episode in episodic memory. */
    private storeEpisode;
}
//# sourceMappingURL=orchestrator.d.ts.map