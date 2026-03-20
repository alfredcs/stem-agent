import { Router } from "express";
import type { AP2IntentMandate, AP2PaymentMandate, AP2PaymentReceipt } from "@stem-agent/shared";
/**
 * AP2 protocol handler implementing mandate lifecycle.
 *
 * Endpoints:
 *   POST /ap2/mandates/intent           — Create intent mandate (owner sets guardrails)
 *   GET  /ap2/mandates/intent/:id       — Get intent mandate
 *   POST /ap2/mandates/payment          — Create payment mandate (agent binds to intent)
 *   POST /ap2/mandates/payment/:id/approve — Approve payment mandate
 *   POST /ap2/mandates/payment/:id/reject  — Reject payment mandate
 *   GET  /ap2/receipts/:id              — Get payment receipt
 *   GET  /ap2/audit/:intentId           — Full audit trail for an intent mandate
 */
export declare class Ap2Handler {
    private readonly intents;
    private readonly payments;
    private readonly receipts;
    createRouter(): Router;
    /** Execute a payment mandate — creates a receipt. Used by agent core. */
    executePayment(paymentMandateId: string, receipt: Omit<AP2PaymentReceipt, "id" | "timestamp">): AP2PaymentReceipt;
    /** Expose stores for testing. */
    getIntents(): Map<string, AP2IntentMandate>;
    getPayments(): Map<string, AP2PaymentMandate>;
    getReceipts(): Map<string, AP2PaymentReceipt>;
    private getActiveIntent;
    private validateMerchant;
    private validateCurrency;
    private validateAmount;
}
//# sourceMappingURL=ap2-handler.d.ts.map