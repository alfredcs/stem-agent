import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  AP2IntentMandateSchema,
  AP2PaymentMandateSchema,
  AP2PaymentReceiptSchema,
  ValidationError,
  AuthorizationError,
} from "@stem-agent/shared";
import type {
  AP2IntentMandate,
  AP2PaymentMandate,
  AP2PaymentReceipt,
} from "@stem-agent/shared";
import type { AuthenticatedRequest } from "../auth/auth-middleware.js";

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
export class Ap2Handler {
  private readonly intents = new Map<string, AP2IntentMandate>();
  private readonly payments = new Map<string, AP2PaymentMandate>();
  private readonly receipts = new Map<string, AP2PaymentReceipt>();

  createRouter(): Router {
    const router = Router();

    // -- Intent mandates ---------------------------------------------------

    router.post("/ap2/mandates/intent", async (req: AuthenticatedRequest, res, next) => {
      try {
        const body = { id: uuidv4(), ...req.body };
        const parsed = AP2IntentMandateSchema.safeParse(body);
        if (!parsed.success) {
          throw new ValidationError("Invalid intent mandate", {
            issues: parsed.error.issues,
          });
        }

        const mandate = parsed.data;
        if (mandate.expiresAt <= Date.now()) {
          throw new ValidationError("Intent mandate has already expired");
        }

        this.intents.set(mandate.id, mandate);
        res.status(201).json(mandate);
      } catch (err) {
        next(err);
      }
    });

    router.get("/ap2/mandates/intent/:id", (req: AuthenticatedRequest, res, next) => {
      try {
        const mandate = this.getActiveIntent(req.params.id as string);
        res.json(mandate);
      } catch (err) {
        if (err instanceof AuthorizationError) {
          res.status(403).json({ error: err.message });
          return;
        }
        next(err);
      }
    });

    // -- Payment mandates --------------------------------------------------

    router.post("/ap2/mandates/payment", async (req: AuthenticatedRequest, res, next) => {
      try {
        const body = { id: uuidv4(), ...req.body };
        const parsed = AP2PaymentMandateSchema.safeParse(body);
        if (!parsed.success) {
          throw new ValidationError("Invalid payment mandate", {
            issues: parsed.error.issues,
          });
        }

        const payment = parsed.data;
        const intent = this.getActiveIntent(payment.intentMandateId);

        this.validateMerchant(intent, payment.merchantId);
        this.validateCurrency(intent, payment.totalAmount.currency);
        this.validateAmount(intent, payment.totalAmount.amount);

        // Auto-approve if below threshold (same currency required)
        if (intent.autoApproveBelow
          && payment.totalAmount.currency === intent.autoApproveBelow.currency) {
          const threshold = parseFloat(intent.autoApproveBelow.amount);
          const total = parseFloat(payment.totalAmount.amount);
          if (total <= threshold) {
            payment.status = "approved";
            payment.approvedBy = "auto";
          }
        }

        this.payments.set(payment.id, payment);
        res.status(201).json(payment);
      } catch (err) {
        next(err);
      }
    });

    router.post("/ap2/mandates/payment/:id/approve", (req: AuthenticatedRequest, res, next) => {
      try {
        const payment = this.payments.get(req.params.id as string);
        if (!payment) {
          res.status(404).json({ error: "Payment mandate not found" });
          return;
        }
        if (payment.status !== "pending_approval") {
          throw new ValidationError(
            `Cannot approve mandate in status "${payment.status}"`,
          );
        }

        payment.status = "approved";
        payment.approvedBy = req.principal?.id ?? "manual";
        res.json(payment);
      } catch (err) {
        next(err);
      }
    });

    router.post("/ap2/mandates/payment/:id/reject", (req: AuthenticatedRequest, res, next) => {
      try {
        const payment = this.payments.get(req.params.id as string);
        if (!payment) {
          res.status(404).json({ error: "Payment mandate not found" });
          return;
        }
        if (payment.status !== "pending_approval") {
          throw new ValidationError(
            `Cannot reject mandate in status "${payment.status}"`,
          );
        }

        payment.status = "rejected";
        res.json(payment);
      } catch (err) {
        next(err);
      }
    });

    // -- Receipts ----------------------------------------------------------

    router.get("/ap2/receipts/:id", (req: AuthenticatedRequest, res, next) => {
      try {
        const receipt = this.receipts.get(req.params.id as string);
        if (!receipt) {
          res.status(404).json({ error: "Receipt not found" });
          return;
        }
        res.json(receipt);
      } catch (err) {
        next(err);
      }
    });

    // -- Audit trail -------------------------------------------------------

    router.get("/ap2/audit/:intentId", (req: AuthenticatedRequest, res, next) => {
      try {
        const intent = this.intents.get(req.params.intentId as string);
        if (!intent) {
          res.status(404).json({ error: "Intent mandate not found" });
          return;
        }

        const linkedPayments = Array.from(this.payments.values()).filter(
          (p) => p.intentMandateId === intent.id,
        );

        const linkedReceipts = linkedPayments.flatMap((p) => {
          const r = Array.from(this.receipts.values()).filter(
            (receipt) => receipt.paymentMandateId === p.id,
          );
          return r;
        });

        res.json({
          intent,
          payments: linkedPayments,
          receipts: linkedReceipts,
        });
      } catch (err) {
        next(err);
      }
    });

    return router;
  }

  /** Execute a payment mandate — creates a receipt. Used by agent core. */
  executePayment(
    paymentMandateId: string,
    receipt: Omit<AP2PaymentReceipt, "id" | "timestamp">,
  ): AP2PaymentReceipt {
    const payment = this.payments.get(paymentMandateId);
    if (!payment) throw new ValidationError("Payment mandate not found");
    if (payment.status !== "approved") {
      throw new ValidationError("Payment mandate not approved");
    }

    // Verify the backing intent is still valid
    this.getActiveIntent(payment.intentMandateId);

    const parsed = AP2PaymentReceiptSchema.parse({ id: uuidv4(), ...receipt });
    this.receipts.set(parsed.id, parsed);

    payment.status = parsed.status === "success" ? "executed" : "failed";
    return parsed;
  }

  /** Expose stores for testing. */
  getIntents(): Map<string, AP2IntentMandate> {
    return this.intents;
  }

  getPayments(): Map<string, AP2PaymentMandate> {
    return this.payments;
  }

  getReceipts(): Map<string, AP2PaymentReceipt> {
    return this.receipts;
  }

  private getActiveIntent(id: string): AP2IntentMandate {
    const intent = this.intents.get(id);
    if (!intent) {
      throw new ValidationError("Intent mandate not found");
    }
    if (intent.status === "expired" || intent.expiresAt <= Date.now()) {
      intent.status = "expired";
      throw new AuthorizationError("Intent mandate has expired");
    }
    if (intent.status === "revoked") {
      throw new AuthorizationError("Intent mandate has been revoked");
    }
    return intent;
  }

  private validateMerchant(intent: AP2IntentMandate, merchantId: string): void {
    if (intent.allowedMerchants.length > 0 && !intent.allowedMerchants.includes(merchantId)) {
      throw new AuthorizationError(
        `Merchant "${merchantId}" not in allowed list`,
      );
    }
  }

  private validateCurrency(intent: AP2IntentMandate, currency: string): void {
    if (currency !== intent.maxAmount.currency) {
      throw new ValidationError(
        `Currency "${currency}" does not match intent currency "${intent.maxAmount.currency}"`,
      );
    }
  }

  private validateAmount(intent: AP2IntentMandate, totalAmount: string): void {
    const max = parseFloat(intent.maxAmount.amount);
    const total = parseFloat(totalAmount);
    if (total > max) {
      throw new ValidationError(
        `Total $${totalAmount} exceeds intent maximum $${intent.maxAmount.amount}`,
      );
    }
  }
}
