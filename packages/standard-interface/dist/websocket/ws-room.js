/**
 * Manages room-based multiplexing for WebSocket connections.
 * Clients can join/leave rooms and receive broadcasts scoped to a room.
 */
export class RoomManager {
    /** room name -> set of connected sockets */
    rooms = new Map();
    /** Add a client to a room. */
    join(room, ws) {
        let members = this.rooms.get(room);
        if (!members) {
            members = new Set();
            this.rooms.set(room, members);
        }
        members.add(ws);
    }
    /** Remove a client from a room. */
    leave(room, ws) {
        const members = this.rooms.get(room);
        if (!members)
            return;
        members.delete(ws);
        if (members.size === 0)
            this.rooms.delete(room);
    }
    /** Remove a client from all rooms. */
    leaveAll(ws) {
        for (const [room, members] of this.rooms) {
            members.delete(ws);
            if (members.size === 0)
                this.rooms.delete(room);
        }
    }
    /** Broadcast a message to all clients in a room. */
    broadcast(room, data, exclude) {
        const members = this.rooms.get(room);
        if (!members)
            return;
        for (const ws of members) {
            if (ws !== exclude && ws.readyState === ws.OPEN) {
                ws.send(data);
            }
        }
    }
    /** Get the number of clients in a room. */
    size(room) {
        return this.rooms.get(room)?.size ?? 0;
    }
}
//# sourceMappingURL=ws-room.js.map