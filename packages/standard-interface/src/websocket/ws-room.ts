import type { WebSocket } from "ws";

/**
 * Manages room-based multiplexing for WebSocket connections.
 * Clients can join/leave rooms and receive broadcasts scoped to a room.
 */
export class RoomManager {
  /** room name -> set of connected sockets */
  private readonly rooms = new Map<string, Set<WebSocket>>();

  /** Add a client to a room. */
  join(room: string, ws: WebSocket): void {
    let members = this.rooms.get(room);
    if (!members) {
      members = new Set();
      this.rooms.set(room, members);
    }
    members.add(ws);
  }

  /** Remove a client from a room. */
  leave(room: string, ws: WebSocket): void {
    const members = this.rooms.get(room);
    if (!members) return;
    members.delete(ws);
    if (members.size === 0) this.rooms.delete(room);
  }

  /** Remove a client from all rooms. */
  leaveAll(ws: WebSocket): void {
    for (const [room, members] of this.rooms) {
      members.delete(ws);
      if (members.size === 0) this.rooms.delete(room);
    }
  }

  /** Broadcast a message to all clients in a room. */
  broadcast(room: string, data: string, exclude?: WebSocket): void {
    const members = this.rooms.get(room);
    if (!members) return;

    for (const ws of members) {
      if (ws !== exclude && ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    }
  }

  /** Get the number of clients in a room. */
  size(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }
}
