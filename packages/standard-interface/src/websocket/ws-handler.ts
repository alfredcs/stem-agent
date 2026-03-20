import { WebSocketServer, type WebSocket, type RawData } from "ws";
import type { Server as HttpServer } from "node:http";
import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, Logger, Credential } from "@stem-agent/shared";
import { A2UIUserActionSchema, A2UIServerMessageSchema, A2UI_CONTENT_TYPE } from "@stem-agent/shared";
import type { IAuthProvider } from "../auth/types.js";
import { WsEventType, type WsEvent } from "./ws-events.js";
import { RoomManager } from "./ws-room.js";

const HEARTBEAT_INTERVAL_MS = 30_000;
const REPLAY_BUFFER_SIZE = 100;

/**
 * WebSocket handler for real-time bidirectional communication.
 * Supports heartbeat, room-based multiplexing, and message replay on reconnect.
 */
export class WsHandler {
  private wss: WebSocketServer | null = null;
  private readonly rooms = new RoomManager();
  private readonly replayBuffer: WsEvent[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly agent: IStemAgent,
    private readonly logger: Logger,
    private readonly authProviders?: IAuthProvider[],
  ) {}

  /** Attach to an existing HTTP server for WebSocket upgrade. */
  attach(server: HttpServer): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", async (ws, req) => {
      // Authenticate if auth providers are configured
      if (this.authProviders && this.authProviders.length > 0) {
        const url = new URL(req.url ?? "", `ws://${req.headers.host ?? "localhost"}`);
        const token = url.searchParams.get("token");

        if (!token) {
          ws.close(4001, "Unauthorized");
          return;
        }

        const credential: Credential = {
          type: "bearer_token",
          value: token,
          metadata: {},
        };

        let authenticated = false;
        for (const provider of this.authProviders) {
          try {
            const principal = await provider.authenticate(credential);
            if (principal) {
              (ws as unknown as Record<string, unknown>).__principal = principal;
              authenticated = true;
              break;
            }
          } catch {
            // Provider failed, try next
          }
        }

        if (!authenticated) {
          ws.close(4001, "Unauthorized");
          return;
        }
      }

      this.clients.add(ws);
      this.logger.info(
        { remoteAddress: req.socket.remoteAddress },
        "ws client connected",
      );

      // Mark alive for heartbeat
      (ws as unknown as Record<string, boolean>).isAlive = true;
      ws.on("pong", () => {
        (ws as unknown as Record<string, boolean>).isAlive = true;
      });

      ws.on("message", (raw) => {
        this.handleMessage(ws, raw).catch((err) => {
          this.logger.error({ error: (err as Error).message }, "ws message handler error");
        });
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        this.rooms.leaveAll(ws);
      });

      ws.on("error", (err) => {
        this.logger.error({ error: err.message }, "ws error");
      });
    });

    this.startHeartbeat();
  }

  /** Gracefully close all connections. */
  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const ws of this.clients) {
      ws.close(1001, "Server shutting down");
    }
    this.wss?.close();
  }

  /** Broadcast an event to all connected clients. */
  broadcastEvent(event: WsEvent): void {
    this.addToReplayBuffer(event);
    const data = JSON.stringify(event);
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  private async handleMessage(ws: WebSocket, raw: RawData): Promise<void> {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      this.sendEvent(ws, {
        type: WsEventType.ERROR,
        data: { message: "Invalid JSON" },
        timestamp: Date.now(),
      });
      return;
    }

    const type = msg.type as string;

    switch (type) {
      case WsEventType.PING:
        this.sendEvent(ws, { type: WsEventType.PONG, timestamp: Date.now() });
        break;

      case WsEventType.CLIENT_JOIN_ROOM:
        if (typeof msg.room === "string") {
          this.rooms.join(msg.room, ws);
        }
        break;

      case WsEventType.CLIENT_LEAVE_ROOM:
        if (typeof msg.room === "string") {
          this.rooms.leave(msg.room, ws);
        }
        break;

      case WsEventType.CLIENT_MESSAGE:
        await this.handleClientTask(ws, msg);
        break;

      case WsEventType.A2UI_USER_ACTION:
        await this.handleA2UIAction(ws, msg);
        break;

      case "replay": {
        // Client reconnected and wants missed events from a timestamp
        const since = (msg.since as number) ?? 0;
        for (const event of this.replayBuffer) {
          if (event.timestamp > since) {
            this.sendEvent(ws, event);
          }
        }
        break;
      }

      default:
        this.sendEvent(ws, {
          type: WsEventType.ERROR,
          data: { message: `Unknown event type: ${type}` },
          timestamp: Date.now(),
        });
    }
  }

  private async handleClientTask(
    ws: WebSocket,
    msg: Record<string, unknown>,
  ): Promise<void> {
    const taskId = (msg.taskId as string) ?? uuidv4();
    const message: AgentMessage = {
      id: uuidv4(),
      role: "user",
      content: msg.message ?? msg.data ?? "",
      contentType: (msg.contentType as string) ?? "text/plain",
      metadata: (msg.metadata as Record<string, unknown>) ?? {},
      callerId: msg.callerId as string | undefined,
      sessionId: msg.sessionId as string | undefined,
      timestamp: Date.now(),
    };

    this.sendEvent(ws, {
      type: WsEventType.TASK_STARTED,
      taskId,
      timestamp: Date.now(),
    });

    try {
      const response = await this.agent.process(taskId, message);
      this.sendEvent(ws, {
        type: WsEventType.TASK_COMPLETED,
        taskId,
        data: {
          content: response.content,
          status: response.status,
          artifacts: response.artifacts,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      this.sendEvent(ws, {
        type: WsEventType.TASK_FAILED,
        taskId,
        data: { error: (err as Error).message },
        timestamp: Date.now(),
      });
    }
  }

  private async handleA2UIAction(
    ws: WebSocket,
    msg: Record<string, unknown>,
  ): Promise<void> {
    const parsed = A2UIUserActionSchema.safeParse(msg.data ?? msg);
    if (!parsed.success) {
      this.sendEvent(ws, {
        type: WsEventType.ERROR,
        data: { message: "Invalid A2UI userAction", details: parsed.error.issues },
        timestamp: Date.now(),
      });
      return;
    }

    const action = parsed.data;
    const taskId = (msg.taskId as string) ?? uuidv4();

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

    this.sendEvent(ws, {
      type: WsEventType.TASK_STARTED,
      taskId,
      timestamp: Date.now(),
    });

    try {
      for await (const chunk of this.agent.stream(taskId, message)) {
        if (chunk.contentType === A2UI_CONTENT_TYPE && chunk.content) {
          const messages = Array.isArray(chunk.content)
            ? (chunk.content as unknown[])
            : [chunk.content];
          for (const a2uiMsg of messages) {
            const msgObj = a2uiMsg as Record<string, unknown>;
            const WS_EVENT_MAP: Record<string, string> = {
              beginRendering: WsEventType.A2UI_BEGIN_RENDERING,
              surfaceUpdate: WsEventType.A2UI_SURFACE_UPDATE,
              dataModelUpdate: WsEventType.A2UI_DATA_UPDATE,
              deleteSurface: WsEventType.A2UI_DELETE_SURFACE,
            };
            const eventType = WS_EVENT_MAP[msgObj.type as string] ?? WsEventType.TASK_PROGRESS;

            this.sendEvent(ws, {
              type: eventType,
              taskId,
              data: a2uiMsg,
              timestamp: Date.now(),
            });
          }
        } else {
          this.sendEvent(ws, {
            type: WsEventType.TASK_PROGRESS,
            taskId,
            data: { content: chunk.content, status: chunk.status },
            timestamp: Date.now(),
          });
        }
      }

      this.sendEvent(ws, {
        type: WsEventType.TASK_COMPLETED,
        taskId,
        timestamp: Date.now(),
      });
    } catch (err) {
      this.sendEvent(ws, {
        type: WsEventType.TASK_FAILED,
        taskId,
        data: { error: (err as Error).message },
        timestamp: Date.now(),
      });
    }
  }

  private sendEvent(ws: WebSocket, event: WsEvent): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private addToReplayBuffer(event: WsEvent): void {
    this.replayBuffer.push(event);
    if (this.replayBuffer.length > REPLAY_BUFFER_SIZE) {
      this.replayBuffer.shift();
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const ws of this.clients) {
        if (!(ws as unknown as Record<string, boolean>).isAlive) {
          ws.terminate();
          this.clients.delete(ws);
          this.rooms.leaveAll(ws);
          continue;
        }
        (ws as unknown as Record<string, boolean>).isAlive = false;
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }
}
