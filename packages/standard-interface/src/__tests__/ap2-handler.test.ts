import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { Ap2Handler } from "../ap2/ap2-handler.js";
import { errorHandler } from "../middleware/error-handler.js";

function createApp() {
  const app = express();
  app.use(express.json());
  const handler = new Ap2Handler();
  app.use(handler.createRouter());
  app.use(errorHandler);
  return { app, handler };
}

const futureTs = () => Date.now() + 3_600_000;
const pastTs = () => Date.now() - 3_600_000;

function validIntent(overrides?: Record<string, unknown>) {
  return {
    ownerId: "user-1",
    allowedMerchants: ["nike.com", "adidas.com"],
    maxAmount: { amount: "200.00", currency: "USD" },
    autoApproveBelow: { amount: "50.00", currency: "USD" },
    expiresAt: futureTs(),
    ...overrides,
  };
}

function validPayment(intentMandateId: string, overrides?: Record<string, unknown>) {
  return {
    intentMandateId,
    agentId: "shopping-agent-1",
    merchantId: "nike.com",
    items: [
      { name: "Running Shoes", unitPrice: { amount: "89.99", currency: "USD" } },
    ],
    totalAmount: { amount: "89.99", currency: "USD" },
    ...overrides,
  };
}

describe("Ap2Handler", () => {
  describe("POST /ap2/mandates/intent", () => {
    it("creates an intent mandate with guardrails", async () => {
      const { app } = createApp();
      const res = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.ownerId).toBe("user-1");
      expect(res.body.status).toBe("active");
      expect(res.body.allowedMerchants).toEqual(["nike.com", "adidas.com"]);
      expect(res.body.maxAmount.amount).toBe("200.00");
      expect(res.body.autoApproveBelow.amount).toBe("50.00");
    });

    it("rejects invalid intent mandate", async () => {
      const { app } = createApp();
      const res = await request(app)
        .post("/ap2/mandates/intent")
        .send({ ownerId: "user-1" });

      expect(res.status).toBe(400);
    });

    it("rejects expired intent mandate", async () => {
      const { app } = createApp();
      const res = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent({ expiresAt: pastTs() }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("expired");
    });
  });

  describe("GET /ap2/mandates/intent/:id", () => {
    it("retrieves an intent mandate", async () => {
      const { app } = createApp();
      const createRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const id = createRes.body.id;

      const res = await request(app).get(`/ap2/mandates/intent/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it("returns 403 for expired mandate", async () => {
      const { app, handler } = createApp();
      const createRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const id = createRes.body.id;

      // Manually expire it
      handler.getIntents().get(id)!.expiresAt = pastTs();

      const res = await request(app).get(`/ap2/mandates/intent/${id}`);
      expect(res.status).toBe(403);
    });
  });

  describe("POST /ap2/mandates/payment", () => {
    it("auto-approves when below threshold", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      const res = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId, {
          totalAmount: { amount: "30.00", currency: "USD" },
        }));

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("approved");
      expect(res.body.approvedBy).toBe("auto");
    });

    it("requires manual approval when above threshold", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      const res = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId));

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("pending_approval");
    });

    it("rejects disallowed merchants", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      const res = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId, { merchantId: "unknown-shop.com" }));

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("not in allowed list");
    });

    it("rejects amount exceeding intent max", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      const res = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId, {
          totalAmount: { amount: "500.00", currency: "USD" },
        }));

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("exceeds");
    });

    it("rejects payment against expired intent", async () => {
      const { app, handler } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      handler.getIntents().get(intentId)!.expiresAt = pastTs();

      const res = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId));

      expect(res.status).toBe(403);
    });
  });

  describe("POST /ap2/mandates/payment/:id/approve", () => {
    it("approves a pending payment mandate", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const paymentRes = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentRes.body.id));
      const paymentId = paymentRes.body.id;

      const res = await request(app)
        .post(`/ap2/mandates/payment/${paymentId}/approve`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("approved");
      expect(res.body.approvedBy).toBe("manual");
    });
  });

  describe("POST /ap2/mandates/payment/:id/reject", () => {
    it("rejects a pending payment mandate", async () => {
      const { app } = createApp();
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const paymentRes = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentRes.body.id));
      const paymentId = paymentRes.body.id;

      const res = await request(app)
        .post(`/ap2/mandates/payment/${paymentId}/reject`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("rejected");
    });
  });

  describe("receipts and audit trail", () => {
    it("creates receipt on execution and returns audit trail", async () => {
      const { app, handler } = createApp();

      // Create intent
      const intentRes = await request(app)
        .post("/ap2/mandates/intent")
        .send(validIntent());
      const intentId = intentRes.body.id;

      // Create and auto-approve payment
      const paymentRes = await request(app)
        .post("/ap2/mandates/payment")
        .send(validPayment(intentId, {
          totalAmount: { amount: "30.00", currency: "USD" },
        }));
      const paymentId = paymentRes.body.id;
      expect(paymentRes.body.status).toBe("approved");

      // Execute payment (creates receipt)
      const receipt = handler.executePayment(paymentId, {
        paymentMandateId: paymentId,
        merchantId: "nike.com",
        amount: { amount: "30.00", currency: "USD" },
        status: "success",
        transactionRef: "txn-abc-123",
      });

      expect(receipt.status).toBe("success");

      // Fetch receipt
      const receiptRes = await request(app)
        .get(`/ap2/receipts/${receipt.id}`);
      expect(receiptRes.status).toBe(200);
      expect(receiptRes.body.transactionRef).toBe("txn-abc-123");

      // Verify payment mandate status updated
      const payment = handler.getPayments().get(paymentId)!;
      expect(payment.status).toBe("executed");

      // Fetch full audit trail
      const auditRes = await request(app).get(`/ap2/audit/${intentId}`);
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.intent.id).toBe(intentId);
      expect(auditRes.body.payments).toHaveLength(1);
      expect(auditRes.body.receipts).toHaveLength(1);
      expect(auditRes.body.receipts[0].transactionRef).toBe("txn-abc-123");
    });

    it("returns 404 for unknown receipt", async () => {
      const { app } = createApp();
      const res = await request(app).get("/ap2/receipts/nonexistent");
      expect(res.status).toBe(404);
    });
  });
});
