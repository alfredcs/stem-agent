import { createLogger } from "@stem-agent/shared";
// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
/**
 * Parse a `text/event-stream` response body into an async iterable of
 * JSON-parsed `data:` lines. Stops when the stream ends or the reader
 * signals done.
 */
async function* parseSSE(response) {
    const reader = response.body?.getReader();
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
            // Keep the last (possibly incomplete) chunk in buffer
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
                        // skip unparseable lines
                    }
                }
            }
        }
    }
    finally {
        reader.releaseLock();
    }
}
// ---------------------------------------------------------------------------
// StemAgentClient
// ---------------------------------------------------------------------------
/**
 * High-level TypeScript client for the STEM Agent REST + WebSocket APIs.
 *
 * @example
 * ```ts
 * const client = new StemAgentClient({ baseUrl: "http://localhost:8000" });
 * const res = await client.chat({ message: "Hello" });
 * console.log(res.content);
 * ```
 */
export class StemAgentClient {
    baseUrl;
    wsUrl;
    defaultHeaders;
    log;
    activeSockets = [];
    constructor(opts) {
        // Strip trailing slash
        this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
        this.wsUrl =
            opts.wsUrl ??
                this.baseUrl.replace(/^http/, "ws") + "/ws";
        this.defaultHeaders = {
            "Content-Type": "application/json",
            ...opts.headers,
        };
        if (opts.apiKey) {
            this.defaultHeaders["X-API-Key"] = opts.apiKey;
        }
        this.log = opts.logger ?? createLogger("stem-agent-client");
    }
    // ---- REST helpers -------------------------------------------------------
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        this.log.debug({ method, url }, "request");
        const res = await fetch(url, {
            method,
            headers: this.defaultHeaders,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`STEM agent request failed: ${res.status} ${res.statusText} — ${text}`);
        }
        return (await res.json());
    }
    // ---- Public API ---------------------------------------------------------
    /**
     * Send a chat message and receive the full response.
     * Maps to `POST /api/v1/chat`.
     */
    async chat(req) {
        return this.request("POST", "/api/v1/chat", {
            message: req.message,
            caller_id: req.callerId,
            session_id: req.sessionId,
        });
    }
    /**
     * Send a chat message and stream partial responses via SSE.
     * Maps to `POST /api/v1/chat/stream`.
     */
    async *chatStream(req) {
        const params = new URLSearchParams({ message: req.message });
        if (req.callerId)
            params.set("caller_id", req.callerId);
        if (req.sessionId)
            params.set("session_id", req.sessionId);
        const url = `${this.baseUrl}/api/v1/chat/stream?${params}`;
        this.log.debug({ url }, "chatStream");
        const res = await fetch(url, {
            method: "GET",
            headers: this.defaultHeaders,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`STEM agent stream failed: ${res.status} ${res.statusText} — ${text}`);
        }
        yield* parseSSE(res);
    }
    /**
     * Open a WebSocket connection to the agent.
     * Maps to `GET /ws`.
     */
    connectWebSocket(token) {
        const url = token ? `${this.wsUrl}?token=${encodeURIComponent(token)}` : this.wsUrl;
        this.log.debug({ url }, "connectWebSocket");
        const ws = new WebSocket(url);
        this.activeSockets.push(ws);
        return {
            send(msg) {
                ws.send(JSON.stringify({
                    message: msg.message,
                    caller_id: msg.callerId,
                    session_id: msg.sessionId,
                }));
            },
            async *messages() {
                // Queue incoming messages so the async iterator can consume them
                const queue = [];
                let resolve = null;
                let closed = false;
                ws.addEventListener("message", (event) => {
                    try {
                        const data = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
                        queue.push(data);
                        resolve?.();
                    }
                    catch {
                        // skip unparseable
                    }
                });
                ws.addEventListener("close", () => {
                    closed = true;
                    resolve?.();
                });
                ws.addEventListener("error", () => {
                    closed = true;
                    resolve?.();
                });
                while (!closed) {
                    if (queue.length > 0) {
                        yield queue.shift();
                    }
                    else {
                        await new Promise((r) => {
                            resolve = r;
                        });
                    }
                }
                // Drain remaining
                while (queue.length > 0) {
                    yield queue.shift();
                }
            },
            close() {
                ws.close();
            },
        };
    }
    /**
     * Fetch the A2A agent card.
     * Maps to `GET /.well-known/agent.json`.
     */
    async getAgentCard() {
        return this.request("GET", "/.well-known/agent.json");
    }
    /**
     * Fetch the learned caller profile.
     * Maps to `GET /api/v1/profile/:id`.
     */
    async getCallerProfile(callerId) {
        return this.request("GET", `/api/v1/profile/${encodeURIComponent(callerId)}`);
    }
    /**
     * Fetch current self-adapted behavior parameters.
     * Maps to `GET /api/v1/behavior`.
     */
    async getBehaviorParams() {
        return this.request("GET", "/api/v1/behavior");
    }
    /**
     * List all available MCP tools.
     * Maps to `GET /api/v1/mcp/tools`.
     */
    async listTools() {
        const res = await this.request("GET", "/api/v1/mcp/tools");
        return res.tools;
    }
    /**
     * Close all active WebSocket connections.
     */
    close() {
        for (const ws of this.activeSockets) {
            try {
                ws.close();
            }
            catch {
                // ignore
            }
        }
        this.activeSockets = [];
        this.log.debug("client closed");
    }
}
//# sourceMappingURL=sdk.js.map