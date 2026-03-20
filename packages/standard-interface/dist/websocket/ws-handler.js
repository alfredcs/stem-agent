import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { A2UIUserActionSchema, A2UI_CONTENT_TYPE } from "@stem-agent/shared";
import { WsEventType } from "./ws-events.js";
import { RoomManager } from "./ws-room.js";
const HEARTBEAT_INTERVAL_MS = 30_000;
const REPLAY_BUFFER_SIZE = 100;
/**
 * WebSocket handler for real-time bidirectional communication.
 * Supports heartbeat, room-based multiplexing, and message replay on reconnect.
 */
export class WsHandler {
    agent;
    logger;
    authProviders;
    wss = null;
    rooms = new RoomManager();
    replayBuffer = [];
    heartbeatTimer = null;
    clients = new Set();
    constructor(agent, logger, authProviders) {
        this.agent = agent;
        this.logger = logger;
        this.authProviders = authProviders;
    }
    /** Attach to an existing HTTP server for WebSocket upgrade. */
    attach(server) {
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
                const credential = {
                    type: "bearer_token",
                    value: token,
                    metadata: {},
                };
                let authenticated = false;
                for (const provider of this.authProviders) {
                    try {
                        const principal = await provider.authenticate(credential);
                        if (principal) {
                            ws.__principal = principal;
                            authenticated = true;
                            break;
                        }
                    }
                    catch {
                        // Provider failed, try next
                    }
                }
                if (!authenticated) {
                    ws.close(4001, "Unauthorized");
                    return;
                }
            }
            this.clients.add(ws);
            this.logger.info({ remoteAddress: req.socket.remoteAddress }, "ws client connected");
            // Mark alive for heartbeat
            ws.isAlive = true;
            ws.on("pong", () => {
                ws.isAlive = true;
            });
            ws.on("message", (raw) => {
                this.handleMessage(ws, raw).catch((err) => {
                    this.logger.error({ error: err.message }, "ws message handler error");
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
    close() {
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
    broadcastEvent(event) {
        this.addToReplayBuffer(event);
        const data = JSON.stringify(event);
        for (const ws of this.clients) {
            if (ws.readyState === ws.OPEN) {
                ws.send(data);
            }
        }
    }
    async handleMessage(ws, raw) {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        }
        catch {
            this.sendEvent(ws, {
                type: WsEventType.ERROR,
                data: { message: "Invalid JSON" },
                timestamp: Date.now(),
            });
            return;
        }
        const type = msg.type;
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
                const since = msg.since ?? 0;
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
    async handleClientTask(ws, msg) {
        const taskId = msg.taskId ?? uuidv4();
        const message = {
            id: uuidv4(),
            role: "user",
            content: msg.message ?? msg.data ?? "",
            contentType: msg.contentType ?? "text/plain",
            metadata: msg.metadata ?? {},
            callerId: msg.callerId,
            sessionId: msg.sessionId,
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
        }
        catch (err) {
            this.sendEvent(ws, {
                type: WsEventType.TASK_FAILED,
                taskId,
                data: { error: err.message },
                timestamp: Date.now(),
            });
        }
    }
    async handleA2UIAction(ws, msg) {
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
        const taskId = msg.taskId ?? uuidv4();
        const message = {
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
                        ? chunk.content
                        : [chunk.content];
                    for (const a2uiMsg of messages) {
                        const msgObj = a2uiMsg;
                        const WS_EVENT_MAP = {
                            beginRendering: WsEventType.A2UI_BEGIN_RENDERING,
                            surfaceUpdate: WsEventType.A2UI_SURFACE_UPDATE,
                            dataModelUpdate: WsEventType.A2UI_DATA_UPDATE,
                            deleteSurface: WsEventType.A2UI_DELETE_SURFACE,
                        };
                        const eventType = WS_EVENT_MAP[msgObj.type] ?? WsEventType.TASK_PROGRESS;
                        this.sendEvent(ws, {
                            type: eventType,
                            taskId,
                            data: a2uiMsg,
                            timestamp: Date.now(),
                        });
                    }
                }
                else {
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
        }
        catch (err) {
            this.sendEvent(ws, {
                type: WsEventType.TASK_FAILED,
                taskId,
                data: { error: err.message },
                timestamp: Date.now(),
            });
        }
    }
    sendEvent(ws, event) {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }
    addToReplayBuffer(event) {
        this.replayBuffer.push(event);
        if (this.replayBuffer.length > REPLAY_BUFFER_SIZE) {
            this.replayBuffer.shift();
        }
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            for (const ws of this.clients) {
                if (!ws.isAlive) {
                    ws.terminate();
                    this.clients.delete(ws);
                    this.rooms.leaveAll(ws);
                    continue;
                }
                ws.isAlive = false;
                ws.ping();
            }
        }, HEARTBEAT_INTERVAL_MS);
    }
}
//# sourceMappingURL=ws-handler.js.map