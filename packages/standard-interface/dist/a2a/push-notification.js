/**
 * Manages webhook registrations for push notifications.
 * When task status changes, registered webhooks are notified via HTTP POST.
 */
export class PushNotificationManager {
    logger;
    /** taskId -> Set of webhook URLs. */
    webhooks = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /** Register a webhook URL to receive updates for a given task. */
    register(taskId, webhookUrl) {
        let urls = this.webhooks.get(taskId);
        if (!urls) {
            urls = new Set();
            this.webhooks.set(taskId, urls);
        }
        urls.add(webhookUrl);
        this.logger.debug({ taskId, webhookUrl }, "webhook registered");
    }
    /** Unregister a webhook URL. */
    unregister(taskId, webhookUrl) {
        this.webhooks.get(taskId)?.delete(webhookUrl);
    }
    /** Send a status update to all registered webhooks for a task. */
    async notify(taskId, payload) {
        const urls = this.webhooks.get(taskId);
        if (!urls || urls.size === 0)
            return;
        const body = JSON.stringify({ taskId, ...payload });
        const promises = Array.from(urls).map(async (url) => {
            try {
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                });
            }
            catch (err) {
                this.logger.warn({ taskId, webhookUrl: url, error: err.message }, "push notification failed");
            }
        });
        await Promise.allSettled(promises);
    }
    /** Clean up webhooks for a completed/cancelled task. */
    cleanup(taskId) {
        this.webhooks.delete(taskId);
    }
}
//# sourceMappingURL=push-notification.js.map