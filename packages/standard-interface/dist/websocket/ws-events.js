"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsEventType = void 0;
/**
 * WebSocket event type constants for real-time communication.
 */
exports.WsEventType = {
    // Task lifecycle
    TASK_STARTED: "task.started",
    TASK_PROGRESS: "task.progress",
    TASK_COMPLETED: "task.completed",
    TASK_FAILED: "task.failed",
    TASK_CANCELLED: "task.cancelled",
    // Agent internals
    AGENT_THINKING: "agent.thinking",
    // Tool usage
    TOOL_INVOKED: "tool.invoked",
    TOOL_RESULT: "tool.result",
    // Client messages
    CLIENT_MESSAGE: "client.message",
    CLIENT_JOIN_ROOM: "client.join_room",
    CLIENT_LEAVE_ROOM: "client.leave_room",
    // System
    PING: "ping",
    PONG: "pong",
    ERROR: "error",
};
//# sourceMappingURL=ws-events.js.map