import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage } from "@stem-agent/shared";
import {
  A2UIUserActionSchema,
  A2UIServerMessageSchema,
  A2UI_CONTENT_TYPE,
  type A2UIComponent,
  type A2UIServerMessage,
} from "@stem-agent/shared";

// ---------------------------------------------------------------------------
// Surface state tracked server-side
// ---------------------------------------------------------------------------

interface SurfaceState {
  surfaceId: string;
  components: Map<string, A2UIComponent>;
  rootComponentId?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// A2UI Handler
// ---------------------------------------------------------------------------

/**
 * A2UI protocol handler for dynamic UI composition.
 *
 * Emits beginRendering -> surfaceUpdate -> dataModelUpdate sequences
 * through SSE (POST /a2ui/render) and accepts client interactions
 * via POST /a2ui/action.
 */
export class A2UIHandler {
  private readonly surfaces = new Map<string, SurfaceState>();

  constructor(private readonly agent: IStemAgent) {}

  createRouter(): Router {
    const router = Router();

    // SSE endpoint: agent generates A2UI surface
    router.post("/a2ui/render", async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const taskId = (body.taskId as string) ?? uuidv4();
      const surfaceId = (body.surfaceId as string) ?? uuidv4();

      const message: AgentMessage = {
        id: uuidv4(),
        role: "user",
        content: body.message ?? body.content ?? "",
        contentType: A2UI_CONTENT_TYPE,
        metadata: {
          a2uiRender: true,
          surfaceId,
          ...(body.metadata as Record<string, unknown> ?? {}),
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
            const messages = Array.isArray(chunk.content)
              ? (chunk.content as unknown[])
              : [chunk.content];
            for (const msg of messages) {
              const parsed = A2UIServerMessageSchema.safeParse(msg);
              if (parsed.success) {
                this.trackServerMessage(parsed.data);
                res.write(`data: ${JSON.stringify(parsed.data)}\n\n`);
              }
            }
          } else if (chunk.content) {
            res.write(`data: ${JSON.stringify({
              taskId,
              status: chunk.status,
              content: chunk.content,
            })}\n\n`);
          }
        }
      } catch (err) {
        res.write(`data: ${JSON.stringify({
          error: err instanceof Error ? err.message : "Stream error",
        })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    });

    // Client action endpoint
    router.post("/a2ui/action", async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const parsed = A2UIUserActionSchema.safeParse(body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid A2UI userAction",
          details: parsed.error.issues,
        });
        return;
      }

      const action = parsed.data;
      const taskId = (body.taskId as string) ?? uuidv4();

      const message: AgentMessage = {
        id: uuidv4(),
        role: "user",
        content: action,
        contentType: A2UI_CONTENT_TYPE,
        metadata: {
          a2uiAction: true,
          surfaceId: action.surfaceId,
          componentId: action.componentId,
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
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : "Internal error",
        });
      }
    });

    // List active surfaces
    router.get("/a2ui/surfaces", (_req, res) => {
      const surfaces = Array.from(this.surfaces.values()).map((s) => ({
        surfaceId: s.surfaceId,
        componentCount: s.components.size,
        rootComponentId: s.rootComponentId,
        createdAt: s.createdAt,
      }));
      res.json({ surfaces });
    });

    // Delete a surface
    router.delete("/a2ui/surfaces/:surfaceId", (req, res) => {
      const { surfaceId } = req.params;
      if (this.surfaces.delete(surfaceId)) {
        res.json({ deleted: true, surfaceId });
      } else {
        res.status(404).json({ error: `Surface not found: ${surfaceId}` });
      }
    });

    return router;
  }

  /** Track server-side surface state from outgoing messages. */
  private trackServerMessage(msg: A2UIServerMessage): void {
    switch (msg.type) {
      case "surfaceUpdate": {
        let surface = this.surfaces.get(msg.surfaceId);
        if (!surface) {
          surface = {
            surfaceId: msg.surfaceId,
            components: new Map(),
            createdAt: Date.now(),
          };
          this.surfaces.set(msg.surfaceId, surface);
        }
        for (const comp of msg.components) {
          surface.components.set(comp.id, comp);
        }
        break;
      }
      case "beginRendering": {
        let surface = this.surfaces.get(msg.surfaceId);
        if (!surface) {
          surface = {
            surfaceId: msg.surfaceId,
            components: new Map(),
            createdAt: Date.now(),
          };
          this.surfaces.set(msg.surfaceId, surface);
        }
        surface.rootComponentId = msg.rootComponentId;
        break;
      }
      case "deleteSurface":
        this.surfaces.delete(msg.surfaceId);
        break;
    }
  }

  /** Get a surface state (for testing/introspection). */
  getSurface(surfaceId: string): SurfaceState | undefined {
    return this.surfaces.get(surfaceId);
  }

  /** Get all surface IDs. */
  getSurfaceIds(): string[] {
    return Array.from(this.surfaces.keys());
  }

  /** Validate an A2UI server message. */
  static validate(msg: unknown): A2UIServerMessage {
    return A2UIServerMessageSchema.parse(msg);
  }
}
