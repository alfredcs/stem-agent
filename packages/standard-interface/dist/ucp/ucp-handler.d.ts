import { Router } from "express";
import type { IStemAgent } from "@stem-agent/shared";
/**
 * UCP protocol handler implementing checkout session lifecycle.
 *
 * Endpoints:
 *   GET  /.well-known/ucp                      — Discovery profile
 *   POST /ucp/checkout-sessions                 — Create checkout session
 *   GET  /ucp/checkout-sessions/:id             — Get checkout session
 *   POST /ucp/checkout-sessions/:id/complete    — Complete checkout
 */
export declare class UcpHandler {
    private readonly agent;
    private readonly sessions;
    private readonly idempotencyCache;
    constructor(agent: IStemAgent);
    createRouter(): Router;
}
//# sourceMappingURL=ucp-handler.d.ts.map