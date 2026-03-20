import type { IntentMandate, CartMandate } from "@stem-agent/shared";
export interface PaymentGuardrailConfig {
    /** Maximum payment per transaction (USD). */
    maxPerTransactionUsd: number;
    /** Maximum daily payment total per user (USD). */
    maxDailyPerUserUsd: number;
}
/**
 * Enforces payment budget limits on AP2 mandates.
 * Complements CostGuardrail (which tracks LLM costs) by tracking payment amounts.
 */
export declare class PaymentGuardrail {
    private readonly config;
    private readonly dailyTotals;
    constructor(config: PaymentGuardrailConfig);
    /** Validate an intent mandate's constraints are within budget. */
    checkIntentMandate(callerId: string, _mandate: IntentMandate): void;
    /** Validate a cart mandate's total is within budget. */
    checkCartMandate(callerId: string, mandate: CartMandate): void;
    /** Record a completed payment amount for daily tracking. */
    recordPayment(callerId: string, amountUsd: number): void;
    private checkDailyBudget;
    private getDayKey;
}
//# sourceMappingURL=payment-guardrail.d.ts.map