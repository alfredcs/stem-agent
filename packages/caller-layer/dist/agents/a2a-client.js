import { createLogger } from "@stem-agent/shared";
import { z } from "zod";
/**
 * A2A v0.3.0 wire-format agent card (as returned by `/.well-known/agent.json`).
 * This differs from the internal AgentCard schema — fields like `agentId` and
 * `endpoint` are replaced by `url`, and `securitySchemes` is an object map.
 */
const A2AAgentCardSchema = z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    version: z.string(),
    protocolVersion: z.string().default("0.3.0"),
    capabilities: z.object({
        streaming: z.boolean().default(false),
        pushNotifications: z.boolean().default(false),
    }).default({}),
    defaultInputModes: z.array(z.string()).default(["text/plain"]),
    defaultOutputModes: z.array(z.string()).default(["text/plain"]),
    skills: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        tags: z.array(z.string()).default([]),
        examples: z.array(z.string()).default([]),
    })).default([]),
    securitySchemes: z.record(z.unknown()).default({}),
    security: z.array(z.record(z.array(z.string()))).default([]),
});
import { randomUUID } from "node:crypto";
// ---------------------------------------------------------------------------
// A2AClient
// ---------------------------------------------------------------------------
/**
 * Client for communicating with a STEM agent (or any A2A-compatible agent)
 * via the A2A protocol (JSON-RPC 2.0).
 *
 * @example
 * ```ts
 * const client = new A2AClient({ endpoint: "http://localhost:8000" });
 * const card = await client.discoverAgent();
 * const result = await client.sendTask({ content: "Analyze Q3 sales" });
 * ```
 */
export class A2AClient {
    endpoint;
    headers;
    maxRetries;
    backoffMs;
    log;
    constructor(opts) {
        this.endpoint = opts.endpoint.replace(/\/+$/, "");
        this.headers = { "Content-Type": "application/json" };
        if (opts.apiKey) {
            this.headers["X-API-Key"] = opts.apiKey;
        }
        this.maxRetries = opts.maxRetries ?? 3;
        this.backoffMs = opts.backoffMs ?? 500;
        this.log = opts.logger ?? createLogger("a2a-client");
    }
    // ---- JSON-RPC helpers ---------------------------------------------------
    async rpc(method, params) {
        const id = randomUUID();
        const body = {
            jsonrpc: "2.0",
            id,
            method,
            params,
        };
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const res = await fetch(`${this.endpoint}/a2a`, {
                    method: "POST",
                    headers: this.headers,
                    body: JSON.stringify(body),
                });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} ${res.statusText}`);
                }
                const json = (await res.json());
                if (json.error) {
                    throw new A2AError(json.error.code, json.error.message, json.error.data);
                }
                return json.result;
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < this.maxRetries) {
                    const delay = this.backoffMs * 2 ** attempt;
                    this.log.warn({ attempt, delay, error: lastError.message }, "retrying A2A call");
                    await sleep(delay);
                }
            }
        }
        throw lastError;
    }
    // ---- Public API ---------------------------------------------------------
    /**
     * Discover the remote agent by fetching its Agent Card.
     * Maps to `GET /.well-known/agent.json`.
     */
    async discoverAgent() {
        const res = await fetch(`${this.endpoint}/.well-known/agent.json`, {
            headers: this.headers,
        });
        if (!res.ok) {
            throw new Error(`Agent discovery failed: ${res.status} ${res.statusText}`);
        }
        const raw = await res.json();
        return A2AAgentCardSchema.parse(raw);
    }
    /**
     * Send a task to the remote agent.
     * Maps to JSON-RPC method `tasks/send`.
     */
    async sendTask(message) {
        return this.rpc("tasks/send", { message });
    }
    /**
     * Get the status / result of a previously sent task.
     * Maps to JSON-RPC method `tasks/get`.
     */
    async getTask(taskId) {
        return this.rpc("tasks/get", { task_id: taskId });
    }
    /**
     * Cancel a running task.
     * Maps to JSON-RPC method `tasks/cancel`.
     */
    async cancelTask(taskId) {
        return this.rpc("tasks/cancel", {
            task_id: taskId,
        });
    }
    /**
     * Subscribe to streaming updates for a task.
     * Maps to JSON-RPC method `tasks/sendSubscribe`.
     * Returns an async iterable of partial responses (SSE-backed).
     */
    async *subscribeToTask(message) {
        const id = randomUUID();
        const body = {
            jsonrpc: "2.0",
            id,
            method: "tasks/sendSubscribe",
            params: { message },
        };
        const res = await fetch(`${this.endpoint}/a2a`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            throw new Error(`A2A subscribe failed: ${res.status} ${res.statusText}`);
        }
        const reader = res.body?.getReader();
        if (!reader)
            return;
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        const json = trimmed.slice(6);
                        if (json === "[DONE]")
                            return;
                        try {
                            yield JSON.parse(json);
                        }
                        catch {
                            // skip unparseable
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
}
// ---------------------------------------------------------------------------
// A2A Error
// ---------------------------------------------------------------------------
/** Error thrown when the remote agent returns a JSON-RPC error. */
export class A2AError extends Error {
    code;
    data;
    constructor(code, message, data) {
        super(`A2A error ${code}: ${message}`);
        this.code = code;
        this.data = data;
        this.name = "A2AError";
    }
}
// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=a2a-client.js.map