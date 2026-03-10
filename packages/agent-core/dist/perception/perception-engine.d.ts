import type { IMemoryManager, AgentMessage, PerceptionResult } from "@stem-agent/shared";
import type { ILLMClient } from "../llm/index.js";
/**
 * Perception Engine — ingests and normalizes incoming messages.
 *
 * Extracts intent, entities, complexity, and caller style signals.
 * Uses deterministic heuristics (no LLM). LLM-based perception
 * can be plugged in as a future enhancement.
 */
export declare class PerceptionEngine {
    private readonly memory;
    private readonly log;
    private readonly llmClient?;
    private readonly llmModel?;
    constructor(memory: IMemoryManager, llmClient?: ILLMClient, llmModel?: string);
    /**
     * Perceive an incoming message and produce a structured PerceptionResult.
     *
     * @param message - The incoming agent message.
     * @param availableTools - Names of tools currently available via MCP.
     * @returns Validated PerceptionResult.
     */
    perceive(message: AgentMessage, availableTools: string[]): Promise<PerceptionResult>;
    /** Attempt LLM-based perception. Returns null on parse failure. */
    private llmPerceive;
    /** Extract plain text from message content. */
    private extractText;
    /** Classify intent using keyword heuristics. */
    private classifyIntent;
    /** Extract entities: URLs, code blocks, numbers. */
    private extractEntities;
    /** Classify complexity based on text length, entity count, and structure. */
    private classifyComplexity;
    /** Detect urgency from keywords. */
    private detectUrgency;
    /** Detect domain from text and available tool names. */
    private detectDomain;
    /** Extract caller style signals from message metadata. */
    private extractCallerStyleSignals;
}
//# sourceMappingURL=perception-engine.d.ts.map