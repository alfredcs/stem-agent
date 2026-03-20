import { Router } from "express";
import type { IStemAgent } from "@stem-agent/shared";
import { type A2UIComponent, type A2UIServerMessage } from "@stem-agent/shared";
interface SurfaceState {
    surfaceId: string;
    components: Map<string, A2UIComponent>;
    rootComponentId?: string;
    createdAt: number;
}
/**
 * A2UI protocol handler for dynamic UI composition.
 *
 * Emits beginRendering -> surfaceUpdate -> dataModelUpdate sequences
 * through SSE (POST /a2ui/render) and accepts client interactions
 * via POST /a2ui/action.
 */
export declare class A2UIHandler {
    private readonly agent;
    private readonly surfaces;
    constructor(agent: IStemAgent);
    createRouter(): Router;
    /** Track server-side surface state from outgoing messages. */
    private trackServerMessage;
    /** Get a surface state (for testing/introspection). */
    getSurface(surfaceId: string): SurfaceState | undefined;
    /** Get all surface IDs. */
    getSurfaceIds(): string[];
    /** Validate an A2UI server message. */
    static validate(msg: unknown): A2UIServerMessage;
}
export {};
//# sourceMappingURL=a2ui-handler.d.ts.map