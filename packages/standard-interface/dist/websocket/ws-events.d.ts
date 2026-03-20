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
    readonly A2UI_BEGIN_RENDERING: "a2ui.begin_rendering";
    readonly A2UI_SURFACE_UPDATE: "a2ui.surface_update";
    readonly A2UI_DATA_UPDATE: "a2ui.data_update";
    readonly A2UI_DELETE_SURFACE: "a2ui.delete_surface";
    readonly A2UI_USER_ACTION: "a2ui.user_action";
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