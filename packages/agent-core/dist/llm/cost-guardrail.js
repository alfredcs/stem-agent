"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostGuardrail = void 0;
const shared_1 = require("@stem-agent/shared");
/**
 * Cost guardrail that enforces per-interaction and daily budget limits.
 */
class CostGuardrail {
    config;
    interactionCalls = 0;
    interactionCost = 0;
    dailyCosts = new Map();
    constructor(config) {
        this.config = config;
    }
    /** Check budget limits before an LLM call. Throws BudgetExceededError if exceeded. */
    checkBudget(callerId) {
        if (this.interactionCalls >= this.config.maxLlmCallsPerInteraction) {
            throw new shared_1.BudgetExceededError(`Max LLM calls per interaction exceeded (${this.config.maxLlmCallsPerInteraction})`);
        }
        if (this.interactionCost >= this.config.maxCostPerInteractionUsd) {
            throw new shared_1.BudgetExceededError(`Max cost per interaction exceeded ($${this.config.maxCostPerInteractionUsd})`);
        }
        const dayKey = this.getDayKey();
        const dailyCost = this.dailyCosts.get(dayKey) ?? 0;
        if (dailyCost >= this.config.maxCostPerUserDailyUsd) {
            throw new shared_1.BudgetExceededError(`Daily budget exceeded for caller "${callerId}" ($${this.config.maxCostPerUserDailyUsd})`);
        }
    }
    /** Record the cost of an LLM call. */
    recordCost(callerId, cost) {
        this.interactionCalls++;
        this.interactionCost += cost;
        const dayKey = this.getDayKey();
        this.dailyCosts.set(dayKey, (this.dailyCosts.get(dayKey) ?? 0) + cost);
    }
    /** Reset per-interaction counters. Called at the start of each process(). */
    resetInteraction() {
        this.interactionCalls = 0;
        this.interactionCost = 0;
    }
    /** Get the current day key for daily bucketing. */
    getDayKey() {
        return new Date().toISOString().slice(0, 10);
    }
}
exports.CostGuardrail = CostGuardrail;
//# sourceMappingURL=cost-guardrail.js.map