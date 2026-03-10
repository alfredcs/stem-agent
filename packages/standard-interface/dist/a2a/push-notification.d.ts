import type { Logger } from "@stem-agent/shared";
/**
 * Manages webhook registrations for push notifications.
 * When task status changes, registered webhooks are notified via HTTP POST.
 */
export declare class PushNotificationManager {
    private readonly logger;
    /** taskId -> Set of webhook URLs. */
    private readonly webhooks;
    constructor(logger: Logger);
    /** Register a webhook URL to receive updates for a given task. */
    register(taskId: string, webhookUrl: string): void;
    /** Unregister a webhook URL. */
    unregister(taskId: string, webhookUrl: string): void;
    /** Send a status update to all registered webhooks for a task. */
    notify(taskId: string, payload: Record<string, unknown>): Promise<void>;
    /** Clean up webhooks for a completed/cancelled task. */
    cleanup(taskId: string): void;
}
//# sourceMappingURL=push-notification.d.ts.map