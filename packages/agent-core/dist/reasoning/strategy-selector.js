"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategySelector = void 0;
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
class StrategySelector {
    /**
     * Select a reasoning strategy for the given perception.
     *
     * @param perception - The perception result from the perception engine.
     * @param requiresTools - Whether the task appears to require tool use.
     * @returns The selected reasoning strategy identifier.
     */
    select(perception, requiresTools) {
        if (requiresTools) {
            return "react";
        }
        if (perception.complexity === "complex") {
            return "reflexion";
        }
        if (perception.intent === "analysis_request" && perception.complexity === "medium") {
            return "internal_debate";
        }
        if (perception.intent === "creative_request") {
            return "internal_debate";
        }
        return "chain_of_thought";
    }
}
exports.StrategySelector = StrategySelector;
//# sourceMappingURL=strategy-selector.js.map