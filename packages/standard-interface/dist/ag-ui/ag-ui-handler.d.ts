import { Router } from "express";
import type { IStemAgent } from "@stem-agent/shared";
/**
 * AG-UI protocol handler implementing SSE event streaming.
 *
 * Accepts POST /ag-ui with either:
 * - Full RunAgentInput: { threadId, runId, messages, tools, state, ... }
 * - Simple input: { message, threadId?, runId?, state? }
 *
 * Streams typed AG-UI events as Server-Sent Events using the format:
 *   event: {eventType}\ndata: {json}\n\n
 */
export declare class AGUIHandler {
    private readonly agent;
    constructor(agent: IStemAgent);
    createRouter(): Router;
    /**
     * Streams through the StemAgent pipeline, emitting AG-UI events.
     */
    private streamPipeline;
    /**
     * Map a single pipeline phase yield into AG-UI events.
     */
    private emitPhaseEvents;
}
//# sourceMappingURL=ag-ui-handler.d.ts.map