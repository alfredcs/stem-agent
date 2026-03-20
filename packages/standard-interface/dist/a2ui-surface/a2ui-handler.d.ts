import { Router } from "express";
import type { IStemAgent, A2UIServerMessage, SurfaceUpdate, DataModelUpdate, BeginRendering, ComponentInstance } from "@stem-agent/shared";
interface SurfaceState {
    surfaceId: string;
    components: Map<string, ComponentInstance>;
    rootId?: string;
    catalogId?: string;
    createdAt: number;
}
/**
 * A2UI protocol handler for dynamic UI composition.
 *
 * Manages surfaces, emits A2UI messages (surfaceUpdate, dataModelUpdate,
 * beginRendering, deleteSurface) through SSE and provides a REST endpoint
 * for receiving userAction events from clients.
 */
export declare class A2UIHandler {
    private readonly agent;
    private readonly surfaces;
    constructor(agent: IStemAgent);
    /** Creates an Express router for A2UI endpoints. */
    createRouter(): Router;
    /** Apply a surfaceUpdate, tracking component state. */
    applySurfaceUpdate(update: SurfaceUpdate): A2UIServerMessage;
    /** Apply a dataModelUpdate. */
    applyDataModelUpdate(update: DataModelUpdate): A2UIServerMessage;
    /** Signal the client to begin rendering a surface. */
    beginRendering(params: BeginRendering): A2UIServerMessage;
    /** Delete a surface. */
    deleteSurface(surfaceId: string): A2UIServerMessage;
    /** Get a surface state (for introspection/testing). */
    getSurface(surfaceId: string): SurfaceState | undefined;
    /** Get all surface IDs. */
    getSurfaceIds(): string[];
    /**
     * Validate an A2UI server message against the schema.
     * Returns the parsed message or throws on invalid input.
     */
    static validate(msg: unknown): A2UIServerMessage;
}
export {};
//# sourceMappingURL=a2ui-handler.d.ts.map