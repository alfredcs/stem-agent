import type { PerceptionResult, ReasoningStrategy } from "@stem-agent/shared";
/**
 * Selects the optimal reasoning strategy based on task characteristics.
 *
 * Logic follows design doc Sec 6.2:
 * - Tool-requiring tasks → ReAct
 * - Complex tasks → Reflexion
 * - Analysis + medium complexity → Internal Debate
 * - Creative requests → Internal Debate
 * - Default → Chain of Thought
 */
export declare class StrategySelector {
    /**
     * Select a reasoning strategy for the given perception.
     *
     * @param perception - The perception result from the perception engine.
     * @param requiresTools - Whether the task appears to require tool use.
     * @returns The selected reasoning strategy identifier.
     */
    select(perception: PerceptionResult, requiresTools: boolean): ReasoningStrategy;
}
//# sourceMappingURL=strategy-selector.d.ts.map