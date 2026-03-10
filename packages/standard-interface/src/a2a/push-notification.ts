import type { Logger } from "@stem-agent/shared";

/**
 * Manages webhook registrations for push notifications.
 * When task status changes, registered webhooks are notified via HTTP POST.
 */
export class PushNotificationManager {
  /** taskId -> Set of webhook URLs. */
  private readonly webhooks = new Map<string, Set<string>>();

  constructor(private readonly logger: Logger) {}

  /** Register a webhook URL to receive updates for a given task. */
  register(taskId: string, webhookUrl: string): void {
    let urls = this.webhooks.get(taskId);
    if (!urls) {
      urls = new Set();
      this.webhooks.set(taskId, urls);
    }
    urls.add(webhookUrl);
    this.logger.debug({ taskId, webhookUrl }, "webhook registered");
  }

  /** Unregister a webhook URL. */
  unregister(taskId: string, webhookUrl: string): void {
    this.webhooks.get(taskId)?.delete(webhookUrl);
  }

  /** Send a status update to all registered webhooks for a task. */
  async notify(
    taskId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const urls = this.webhooks.get(taskId);
    if (!urls || urls.size === 0) return;

    const body = JSON.stringify({ taskId, ...payload });

    const promises = Array.from(urls).map(async (url) => {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
      } catch (err) {
        this.logger.warn(
          { taskId, webhookUrl: url, error: (err as Error).message },
          "push notification failed",
        );
      }
    });

    await Promise.allSettled(promises);
  }

  /** Clean up webhooks for a completed/cancelled task. */
  cleanup(taskId: string): void {
    this.webhooks.delete(taskId);
  }
}
