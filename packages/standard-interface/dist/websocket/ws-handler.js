"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsHandler = void 0;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const ws_events_js_1 = require("./ws-events.js");
const ws_room_js_1 = require("./ws-room.js");
const HEARTBEAT_INTERVAL_MS = 30_000;
const REPLAY_BUFFER_SIZE = 100;
/**
 * WebSocket handler for real-time bidirectional communication.
 * Supports heartbeat, room-based multiplexing, and message replay on reconnect.
 */
class WsHandler {
    agent;
    logger;
    authProviders;
    wss = null;
    rooms = new ws_room_js_1.RoomManager();
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
        this.wss = new ws_1.WebSocketServer({ server, path: "/ws" });
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
                type: ws_events_js_1.WsEventType.ERROR,
                data: { message: "Invalid JSON" },
                timestamp: Date.now(),
            });
            return;
        }
        const type = msg.type;
        switch (type) {
            case ws_events_js_1.WsEventType.PING:
                this.sendEvent(ws, { type: ws_events_js_1.WsEventType.PONG, timestamp: Date.now() });
                break;
            case ws_events_js_1.WsEventType.CLIENT_JOIN_ROOM:
                if (typeof msg.room === "string") {
                    this.rooms.join(msg.room, ws);
                }
                break;
            case ws_events_js_1.WsEventType.CLIENT_LEAVE_ROOM:
                if (typeof msg.room === "string") {
                    this.rooms.leave(msg.room, ws);
                }
                break;
            case ws_events_js_1.WsEventType.CLIENT_MESSAGE:
                await this.handleClientTask(ws, msg);
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
                    type: ws_events_js_1.WsEventType.ERROR,
                    data: { message: `Unknown event type: ${type}` },
                    timestamp: Date.now(),
                });
        }
    }
    async handleClientTask(ws, msg) {
        const taskId = msg.taskId ?? (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: "user",
            content: msg.message ?? msg.data ?? "",
            contentType: msg.contentType ?? "text/plain",
            metadata: msg.metadata ?? {},
            callerId: msg.callerId,
            sessionId: msg.sessionId,
            timestamp: Date.now(),
        };
        this.sendEvent(ws, {
            type: ws_events_js_1.WsEventType.TASK_STARTED,
            taskId,
            timestamp: Date.now(),
        });
        try {
            const response = await this.agent.process(taskId, message);
            this.sendEvent(ws, {
                type: ws_events_js_1.WsEventType.TASK_COMPLETED,
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
                type: ws_events_js_1.WsEventType.TASK_FAILED,
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
exports.WsHandler = WsHandler;
//# sourceMappingURL=ws-handler.js.map