import { BudgetExceededError } from "@stem-agent/shared";
/**
 * Enforces payment budget limits on AP2 mandates.
 * Complements CostGuardrail (which tracks LLM costs) by tracking payment amounts.
 */
export class PaymentGuardrail {
    config;
    dailyTotals = new Map();
    constructor(config) {
        this.config = config;
    }
    /** Validate an intent mandate's constraints are within budget. */
    checkIntentMandate(callerId, _mandate) {
        this.checkDailyBudget(callerId, 0);
    }
    /** Validate a cart mandate's total is within budget. */
    checkCartMandate(callerId, mandate) {
        const amount = mandate.contents.paymentRequest.details.total.amount.value;
        if (amount > this.config.maxPerTransactionUsd) {
            throw new BudgetExceededError(`Payment $${amount} exceeds per-transaction limit $${this.config.maxPerTransactionUsd}`);
        }
        this.checkDailyBudget(callerId, amount);
    }
    /** Record a completed payment amount for daily tracking. */
    recordPayment(callerId, amountUsd) {
        const dayKey = this.getDayKey();
        const key = `${callerId}:${dayKey}`;
        this.dailyTotals.set(key, (this.dailyTotals.get(key) ?? 0) + amountUsd);
    }
    checkDailyBudget(callerId, pendingAmount) {
        const dayKey = this.getDayKey();
        const key = `${callerId}:${dayKey}`;
        const current = this.dailyTotals.get(key) ?? 0;
        if (current + pendingAmount > this.config.maxDailyPerUserUsd) {
            throw new BudgetExceededError(`Daily payment budget exceeded for "${callerId}" ($${this.config.maxDailyPerUserUsd})`);
        }
    }
    getDayKey() {
        return new Date().toISOString().slice(0, 10);
    }
}
//# sourceMappingURL=payment-guardrail.js.map