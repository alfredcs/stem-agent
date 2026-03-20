/**
 * WebSocket event type constants for real-time communication.
 */
export const WsEventType = {
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

  // A2UI events
  A2UI_BEGIN_RENDERING: "a2ui.begin_rendering",
  A2UI_SURFACE_UPDATE: "a2ui.surface_update",
  A2UI_DATA_UPDATE: "a2ui.data_update",
  A2UI_DELETE_SURFACE: "a2ui.delete_surface",
  A2UI_USER_ACTION: "a2ui.user_action",

  // System
  PING: "ping",
  PONG: "pong",
  ERROR: "error",
} as const;

export type WsEventType = (typeof WsEventType)[keyof typeof WsEventType];

/** Wire format for a WebSocket event. */
export interface WsEvent {
  type: WsEventType | string;
  taskId?: string;
  data?: unknown;
  timestamp: number;
}
