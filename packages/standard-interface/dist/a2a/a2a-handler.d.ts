import { Router } from "express";
import type { IStemAgent } from "@stem-agent/shared";
/**
 * A2A protocol handler implementing JSON-RPC 2.0 task lifecycle.
 * Methods: tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel.
 */
export declare class A2AHandler {
    private readonly agent;
    private readonly tasks;
    constructor(agent: IStemAgent);
    /** Creates an Express router for the A2A endpoint at POST /a2a. */
    createRouter(): Router;
    private handleSend;
    private handleSendSubscribe;
    private handleGet;
    private handleCancel;
}
//# sourceMappingURL=a2a-handler.d.ts.map