import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { A2UIServerMessageSchema, UserActionSchema, A2UI_CONTENT_TYPE, } from "@stem-agent/shared";
// ---------------------------------------------------------------------------
// A2UI Handler
// ---------------------------------------------------------------------------
/**
 * A2UI protocol handler for dynamic UI composition.
 *
 * Manages surfaces, emits A2UI messages (surfaceUpdate, dataModelUpdate,
 * beginRendering, deleteSurface) through SSE and provides a REST endpoint
 * for receiving userAction events from clients.
 */
export class A2UIHandler {
    agent;
    surfaces = new Map();
    constructor(agent) {
        this.agent = agent;
    }
    /** Creates an Express router for A2UI endpoints. */
    createRouter() {
        const router = Router();
        // POST /a2ui/action — receive userAction from client
        router.post("/a2ui/action", async (req, res) => {
            const body = req.body;
            const parsed = UserActionSchema.safeParse(body);
            if (!parsed.success) {
                res.status(400).json({
                    error: "Invalid userAction",
                    details: parsed.error.issues,
                });
                return;
            }
            const action = parsed.data;
            const taskId = body.taskId ?? uuidv4();
            const message = {
                id: uuidv4(),
                role: "user",
                content: action,
                contentType: A2UI_CONTENT_TYPE,
                metadata: {
                    a2uiAction: true,
                    surfaceId: action.surfaceId,
                    sourceComponentId: action.sourceComponentId,
                },
                timestamp: Date.now(),
            };
            try {
                const response = await this.agent.process(taskId, message);
                res.json({
                    taskId,
                    status: response.status,
                    content: response.content,
                });
            }
            catch (err) {
                res.status(500).json({
                    error: err instanceof Error ? err.message : "Internal error",
                });
            }
        });
        // POST /a2ui/action/stream — receive userAction, stream A2UI response via SSE
        router.post("/a2ui/action/stream", async (req, res) => {
            const body = req.body;
            const parsed = UserActionSchema.safeParse(body);
            if (!parsed.success) {
                res.status(400).json({
                    error: "Invalid userAction",
                    details: parsed.error.issues,
                });
                return;
            }
            const action = parsed.data;
            const taskId = body.taskId ?? uuidv4();
            const message = {
                id: uuidv4(),
                role: "user",
                content: action,
                contentType: A2UI_CONTENT_TYPE,
                metadata: {
                    a2uiAction: true,
                    surfaceId: action.surfaceId,
                    sourceComponentId: action.sourceComponentId,
                },
                timestamp: Date.now(),
            };
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders();
            try {
                for await (const chunk of this.agent.stream(taskId, message)) {
                    if (chunk.contentType === A2UI_CONTENT_TYPE && chunk.content) {
                        // Emit raw A2UI messages as SSE data lines
                        const messages = Array.isArray(chunk.content)
                            ? chunk.content
                            : [chunk.content];
                        for (const msg of messages) {
                            res.write(`data: ${JSON.stringify(msg)}\n\n`);
                        }
                    }
                    else {
                        res.write(`data: ${JSON.stringify({
                            taskId,
                            status: chunk.status,
                            content: chunk.content,
                        })}\n\n`);
                    }
                }
            }
            catch (err) {
                res.write(`data: ${JSON.stringify({
                    error: err instanceof Error ? err.message : "Stream error",
                })}\n\n`);
            }
            res.write("data: [DONE]\n\n");
            res.end();
        });
        // GET /a2ui/surfaces — list active surfaces
        router.get("/a2ui/surfaces", (_req, res) => {
            const surfaces = Array.from(this.surfaces.values()).map((s) => ({
                surfaceId: s.surfaceId,
                componentCount: s.components.size,
                rootId: s.rootId,
                catalogId: s.catalogId,
                createdAt: s.createdAt,
            }));
            res.json({ surfaces });
        });
        // DELETE /a2ui/surfaces/:surfaceId — delete a surface
        router.delete("/a2ui/surfaces/:surfaceId", (req, res) => {
            const { surfaceId } = req.params;
            if (this.surfaces.delete(surfaceId)) {
                res.json({ deleted: true, surfaceId });
            }
            else {
                res.status(404).json({ error: `Surface not found: ${surfaceId}` });
            }
        });
        return router;
    }
    // ---- Surface management (called by agent core or WebSocket handler) ----
    /** Apply a surfaceUpdate, tracking component state. */
    applySurfaceUpdate(update) {
        const surfaceId = update.surfaceId ?? "default";
        let surface = this.surfaces.get(surfaceId);
        if (!surface) {
            surface = {
                surfaceId,
                components: new Map(),
                createdAt: Date.now(),
            };
            this.surfaces.set(surfaceId, surface);
        }
        for (const comp of update.components) {
            surface.components.set(comp.id, comp);
        }
        return { surfaceUpdate: update };
    }
    /** Apply a dataModelUpdate. */
    applyDataModelUpdate(update) {
        // Server-side we just pass through; data model lives on the client
        return { dataModelUpdate: update };
    }
    /** Signal the client to begin rendering a surface. */
    beginRendering(params) {
        const surfaceId = params.surfaceId ?? "default";
        const surface = this.surfaces.get(surfaceId);
        if (surface) {
            surface.rootId = params.root;
            surface.catalogId = params.catalogId;
        }
        return { beginRendering: params };
    }
    /** Delete a surface. */
    deleteSurface(surfaceId) {
        this.surfaces.delete(surfaceId);
        return { deleteSurface: { surfaceId } };
    }
    /** Get a surface state (for introspection/testing). */
    getSurface(surfaceId) {
        return this.surfaces.get(surfaceId);
    }
    /** Get all surface IDs. */
    getSurfaceIds() {
        return Array.from(this.surfaces.keys());
    }
    /**
     * Validate an A2UI server message against the schema.
     * Returns the parsed message or throws on invalid input.
     */
    static validate(msg) {
        return A2UIServerMessageSchema.parse(msg);
    }
}
//# sourceMappingURL=a2ui-handler.js.map