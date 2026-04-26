import type { IMCPManager, IMemoryManager, PerceptionResult, ReasoningResult, ReasoningStrategy, BehaviorParameters } from "@stem-agent/shared";
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
export declare class ReasoningEngine {
    private readonly mcp;
    private readonly memory;
    private readonly selector;
    private readonly maxSteps;
    private readonly log;
    private readonly llmClient?;
    private readonly costGuardrail?;
    private readonly systemPromptPrefix?;
    constructor(mcp: IMCPManager, memory: IMemoryManager, config: AgentCoreConfig, llmClient?: ILLMClient, costGuardrail?: CostGuardrail, systemPromptPrefix?: string);
    /**
     * Reason about a perceived message and produce a structured result.
     *
     * @param perception - Output from the perception engine.
     * @param behavior - Current behavior parameters.
     * @param strategyOverride - When provided, bypasses the strategy selector.
     *   Used by DomainPersona.preferredStrategy to pin differentiated agents.
     * @returns Validated ReasoningResult.
     */
    reason(perception: PerceptionResult, behavior: BehaviorParameters, strategyOverride?: ReasoningStrategy): Promise<ReasoningResult>;
    /**
     * Try an LLM chat call with cost guardrail. Returns null on failure.
     *
     * When a persona systemPromptPrefix is configured, it is prepended to
     * the first system message (or inserted as a new system message at the
     * front) so every reasoning step stays in character for the differentiated
     * agent.
     */
    private llmChat;
    private injectPersonaPrefix;
    /** Chain-of-Thought: sequential reasoning steps without tool use. */
    private chainOfThought;
    /** ReAct: Reason-Act-Observe loop using MCP tools. */
    private react;
    /** Reflexion: Chain-of-thought + self-reflection pass. */
    private reflexion;
    /** Internal Debate: multiple perspectives synthesized. */
    private internalDebate;
    /** Generate a perspective argument for internal debate. */
    private generatePerspective;
    /** LLM-powered chain-of-thought. */
    private llmChainOfThought;
    /** LLM-powered ReAct: multi-turn reason-act loop. */
    private llmReact;
    /** LLM-powered internal debate with 3 personas + synthesis. */
    private llmInternalDebate;
    /** Detect contradictions between reasoning steps. */
    private detectContradictions;
}
//# sourceMappingURL=reasoning-engine.d.ts.map