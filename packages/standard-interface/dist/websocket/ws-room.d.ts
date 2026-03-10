import type { WebSocket } from "ws";
/**
 * Manages room-based multiplexing for WebSocket connections.
 * Clients can join/leave rooms and receive broadcasts scoped to a room.
 */
export declare class RoomManager {
    /** room name -> set of connected sockets */
    private readonly rooms;
    /** Add a client to a room. */
    join(room: string, ws: WebSocket): void;
    /** Remove a client from a room. */
    leave(room: string, ws: WebSocket): void;
    /** Remove a client from all rooms. */
    leaveAll(ws: WebSocket): void;
    /** Broadcast a message to all clients in a room. */
    broadcast(room: string, data: string, exclude?: WebSocket): void;
    /** Get the number of clients in a room. */
    size(room: string): number;
}
//# sourceMappingURL=ws-room.d.ts.map