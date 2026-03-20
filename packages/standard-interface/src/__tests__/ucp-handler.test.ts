import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { UcpHandler } from "../ucp/ucp-handler.js";
import { createMockAgent } from "./helpers.js";

function createTestApp() {
  const agent = createMockAgent();
  const app = express();
  app.use(express.json());

  const handler = new UcpHandler(agent);
  app.use(handler.createRouter());

  return app;
}

const UCP_HEADERS = {
  "UCP-Agent": "test-agent",
  "Idempotency-Key": "idem-1",
  "Request-Id": "req-1",
};

describe("UCP Profile Discovery", () => {
  it("serves UCP profile at /.well-known/ucp", async () => {
    const app = createTestApp();
    const res = await request(app).get("/.well-known/ucp");

    expect(res.status).toBe(200);
    expect(res.body.name).toBeDefined();
    expect(res.body.version).toBe("2026-01-23");
    expect(res.body.capabilities).toContain("checkout");
    expect(res.body.endpoints.checkout).toBeDefined();
  });
});

describe("UCP Checkout Handler", () => {
  it("creates a checkout session with required headers", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send({
        lineItems: [
          { name: "Widget", quantity: 2, unitPrice: { amount: "19.99", currency: "USD" } },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^ucp_cs_/);
    expect(res.body.status).toBe("open");
    expect(res.body.lineItems).toHaveLength(1);
    expect(res.body.totals).toBeDefined();
    expect(res.body.totals.subtotal).toBe("39.98");
  });

  it("rejects checkout without required headers", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ucp/checkout-sessions")
      .send({
        lineItems: [
          { name: "Widget", quantity: 1, unitPrice: { amount: "10.00" } },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing required header");
  });

  it("rejects checkout with no line items", async () => {
    const app = createTestApp();
    const res = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send({ lineItems: [] });

    expect(res.status).toBe(400);
  });

  it("gets a checkout session by ID", async () => {
    const app = createTestApp();

    const createRes = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send({
        lineItems: [
          { name: "Widget", quantity: 1, unitPrice: { amount: "5.00" } },
        ],
      });
    const checkoutId = createRes.body.id;

    const getRes = await request(app)
      .get(`/ucp/checkout-sessions/${checkoutId}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(checkoutId);
    expect(getRes.body.status).toBe("open");
  });

  it("returns 404 for unknown checkout", async () => {
    const app = createTestApp();
    const res = await request(app)
      .get("/ucp/checkout-sessions/ucp_cs_nonexistent");

    expect(res.status).toBe(404);
  });

  it("completes a checkout session", async () => {
    const app = createTestApp();

    const createRes = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send({
        lineItems: [
          { name: "Widget", quantity: 1, unitPrice: { amount: "25.00" } },
        ],
      });
    const checkoutId = createRes.body.id;

    const completeRes = await request(app)
      .post(`/ucp/checkout-sessions/${checkoutId}/complete`)
      .set({ ...UCP_HEADERS, "Idempotency-Key": "idem-2", "Request-Id": "req-2" })
      .send({ payment: { method: "card" } });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe("completed");
    expect(completeRes.body.payment.status).toBe("captured");
  });

  it("rejects completing an already-completed checkout", async () => {
    const app = createTestApp();

    const createRes = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send({
        lineItems: [
          { name: "Widget", quantity: 1, unitPrice: { amount: "5.00" } },
        ],
      });
    const checkoutId = createRes.body.id;

    await request(app)
      .post(`/ucp/checkout-sessions/${checkoutId}/complete`)
      .set({ ...UCP_HEADERS, "Idempotency-Key": "idem-3", "Request-Id": "req-3" })
      .send({});

    const res = await request(app)
      .post(`/ucp/checkout-sessions/${checkoutId}/complete`)
      .set({ ...UCP_HEADERS, "Idempotency-Key": "idem-4", "Request-Id": "req-4" })
      .send({});

    expect(res.status).toBe(409);
  });

  it("supports idempotency via Idempotency-Key", async () => {
    const app = createTestApp();
    const body = {
      lineItems: [
        { name: "Widget", quantity: 1, unitPrice: { amount: "10.00" } },
      ],
    };

    const res1 = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send(body);

    const res2 = await request(app)
      .post("/ucp/checkout-sessions")
      .set(UCP_HEADERS)
      .send(body);

    expect(res1.body.id).toBe(res2.body.id);
  });
});
