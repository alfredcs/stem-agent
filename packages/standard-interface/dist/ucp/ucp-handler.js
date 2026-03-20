import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { UcpCheckoutCreateRequestSchema, UcpCheckoutCompleteRequestSchema, } from "@stem-agent/shared";
/**
 * Compute totals from line items.
 */
function computeTotals(items) {
    let subtotal = 0;
    let currency = "USD";
    for (const item of items) {
        subtotal += parseFloat(item.unitPrice.amount) * item.quantity;
        currency = item.unitPrice.currency;
    }
    return {
        subtotal: subtotal.toFixed(2),
        total: subtotal.toFixed(2),
        currency,
    };
}
/**
 * Validate required UCP headers: UCP-Agent, Idempotency-Key, Request-Id.
 * Returns error message if invalid, null if valid.
 */
function validateUcpHeaders(req) {
    if (!req.headers["ucp-agent"])
        return "Missing required header: UCP-Agent";
    if (!req.headers["idempotency-key"])
        return "Missing required header: Idempotency-Key";
    if (!req.headers["request-id"])
        return "Missing required header: Request-Id";
    return null;
}
/**
 * UCP protocol handler implementing checkout session lifecycle.
 *
 * Endpoints:
 *   GET  /.well-known/ucp                      — Discovery profile
 *   POST /ucp/checkout-sessions                 — Create checkout session
 *   GET  /ucp/checkout-sessions/:id             — Get checkout session
 *   POST /ucp/checkout-sessions/:id/complete    — Complete checkout
 */
export class UcpHandler {
    agent;
    sessions = new Map();
    idempotencyCache = new Map();
    constructor(agent) {
        this.agent = agent;
    }
    createRouter() {
        const router = Router();
        // Discovery profile
        router.get("/.well-known/ucp", (_req, res) => {
            const card = this.agent.getAgentCard();
            const baseUrl = card.endpoint.replace(/\/$/, "");
            const profile = {
                name: card.name,
                description: card.description,
                version: "2026-01-23",
                capabilities: ["checkout"],
                endpoints: {
                    checkout: `${baseUrl}/ucp/checkout-sessions`,
                },
                authentication: { type: "none" },
            };
            res.json(profile);
        });
        // Create checkout session
        router.post("/ucp/checkout-sessions", async (req, res) => {
            const headerError = validateUcpHeaders(req);
            if (headerError) {
                res.status(400).json({ error: headerError });
                return;
            }
            // Idempotency check
            const idempotencyKey = req.headers["idempotency-key"];
            const cached = this.idempotencyCache.get(idempotencyKey);
            if (cached) {
                res.status(200).json(cached);
                return;
            }
            const parsed = UcpCheckoutCreateRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: "Invalid request body",
                    details: parsed.error.issues.map((i) => i.message),
                });
                return;
            }
            try {
                const data = parsed.data;
                const sessionId = `ucp_cs_${uuidv4().replace(/-/g, "").slice(0, 16)}`;
                const session = {
                    id: sessionId,
                    status: "open",
                    lineItems: data.lineItems,
                    totals: computeTotals(data.lineItems),
                    payment: data.payment ? {
                        method: data.payment.method,
                        status: "pending",
                    } : undefined,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
                    metadata: data.metadata,
                };
                this.sessions.set(sessionId, session);
                this.idempotencyCache.set(idempotencyKey, session);
                // Notify agent core about the new checkout
                const message = {
                    id: uuidv4(),
                    role: "system",
                    content: { type: "ucp.checkout.created", session },
                    contentType: "application/json",
                    metadata: {
                        protocol: "ucp",
                        ucpAgent: req.headers["ucp-agent"],
                        requestId: req.headers["request-id"],
                    },
                    timestamp: Date.now(),
                };
                await this.agent.process(sessionId, message, req.principal ?? null);
                res.status(201).json(session);
            }
            catch (err) {
                res.status(500).json({
                    error: err instanceof Error ? err.message : "Internal error",
                });
            }
        });
        // Get checkout session
        router.get("/ucp/checkout-sessions/:id", (req, res) => {
            const id = req.params.id;
            const session = this.sessions.get(id);
            if (!session) {
                res.status(404).json({ error: `Checkout session not found: ${id}` });
                return;
            }
            res.json(session);
        });
        // Complete checkout
        router.post("/ucp/checkout-sessions/:id/complete", async (req, res) => {
            const headerError = validateUcpHeaders(req);
            if (headerError) {
                res.status(400).json({ error: headerError });
                return;
            }
            const id = req.params.id;
            const session = this.sessions.get(id);
            if (!session) {
                res.status(404).json({ error: `Checkout session not found: ${id}` });
                return;
            }
            if (session.status === "completed") {
                res.status(409).json({ error: "Checkout session is already completed" });
                return;
            }
            if (session.status === "cancelled" || session.status === "expired") {
                res.status(409).json({ error: `Checkout session is ${session.status}` });
                return;
            }
            const parsed = UcpCheckoutCompleteRequestSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({
                    error: "Invalid request body",
                    details: parsed.error.issues.map((i) => i.message),
                });
                return;
            }
            try {
                // Notify agent core about payment completion
                const message = {
                    id: uuidv4(),
                    role: "system",
                    content: {
                        type: "ucp.checkout.completing",
                        sessionId: session.id,
                        payment: parsed.data.payment,
                    },
                    contentType: "application/json",
                    metadata: {
                        protocol: "ucp",
                        ucpAgent: req.headers["ucp-agent"],
                        requestId: req.headers["request-id"],
                    },
                    timestamp: Date.now(),
                };
                await this.agent.process(session.id, message, req.principal ?? null);
                session.status = "completed";
                if (parsed.data.payment) {
                    session.payment = {
                        method: parsed.data.payment.method ?? session.payment?.method,
                        status: "captured",
                    };
                }
                res.json(session);
            }
            catch (err) {
                res.status(500).json({
                    error: err instanceof Error ? err.message : "Internal error",
                });
            }
        });
        return router;
    }
}
//# sourceMappingURL=ucp-handler.js.map