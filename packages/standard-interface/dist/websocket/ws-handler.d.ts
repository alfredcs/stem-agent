import type { Server as HttpServer } from "node:http";
import type { IStemAgent, Logger } from "@stem-agent/shared";
import type { IAuthProvider } from "../auth/types.js";
import { type WsEvent } from "./ws-events.js";
/**
 * WebSocket handler for real-time bidirectional communication.
 * Supports heartbeat, room-based multiplexing, and message replay on reconnect.
 */
export declare class WsHandler {
    private readonly agent;
    private readonly logger;
    private readonly authProviders?;
    private wss;
    private readonly rooms;
    private readonly replayBuffer;
    private heartbeatTimer;
    private readonly clients;
    constructor(agent: IStemAgent, logger: Logger, authProviders?: IAuthProvider[] | undefined);
    /** Attach to an existing HTTP server for WebSocket upgrade. */
    attach(server: HttpServer): void;
    /** Gracefully close all connections. */
    close(): void;
    /** Broadcast an event to all connected clients. */
    broadcastEvent(event: WsEvent): void;
    private handleMessage;
    private handleClientTask;
    private sendEvent;
    private addToReplayBuffer;
    private startHeartbeat;
}
//# sourceMappingURL=ws-handler.d.ts.map