import type { CostConfig } from "@stem-agent/shared";
/**
 * Cost guardrail that enforces per-interaction and daily budget limits.
 */
export declare class CostGuardrail {
    private readonly config;
    private interactionCalls;
    private interactionCost;
    private readonly dailyCosts;
    constructor(config: CostConfig);
    /** Check budget limits before an LLM call. Throws BudgetExceededError if exceeded. */
    checkBudget(callerId: string): void;
    /** Record the cost of an LLM call. */
    recordCost(callerId: string, cost: number): void;
    /** Reset per-interaction counters. Called at the start of each process(). */
    resetInteraction(): void;
    /** Get the current day key for daily bucketing. */
    getDayKey(): string;
}
//# sourceMappingURL=cost-guardrail.d.ts.map