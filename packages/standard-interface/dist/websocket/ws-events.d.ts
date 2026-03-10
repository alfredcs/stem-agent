/**
 * WebSocket event type constants for real-time communication.
 */
export declare const WsEventType: {
    readonly TASK_STARTED: "task.started";
    readonly TASK_PROGRESS: "task.progress";
    readonly TASK_COMPLETED: "task.completed";
    readonly TASK_FAILED: "task.failed";
    readonly TASK_CANCELLED: "task.cancelled";
    readonly AGENT_THINKING: "agent.thinking";
    readonly TOOL_INVOKED: "tool.invoked";
    readonly TOOL_RESULT: "tool.result";
    readonly CLIENT_MESSAGE: "client.message";
    readonly CLIENT_JOIN_ROOM: "client.join_room";
    readonly CLIENT_LEAVE_ROOM: "client.leave_room";
    readonly PING: "ping";
    readonly PONG: "pong";
    readonly ERROR: "error";
};
export type WsEventType = (typeof WsEventType)[keyof typeof WsEventType];
/** Wire format for a WebSocket event. */
export interface WsEvent {
    type: WsEventType | string;
    taskId?: string;
    data?: unknown;
    timestamp: number;
}
//# sourceMappingURL=ws-events.d.ts.map