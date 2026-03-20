import { createLogger } from "@stem-agent/shared";
import { MCPTransportError } from "../errors.js";
/**
 * MCP transport over HTTP Server-Sent Events.
 *
 * Sends JSON-RPC requests via POST and receives responses / notifications
 * via an SSE stream opened on connect.
 */
export class SSETransport {
    connected = false;
    nextId = 1;
    abortController = null;
    pending = new Map();
    notificationHandlers = [];
    logger;
    url;
    headers;
    constructor(opts) {
        this.url = opts.url;
        this.headers = opts.headers ?? {};
        this.logger = opts.logger ?? createLogger("sse-transport");
    }
    /** @inheritdoc */
    async connect() {
        if (this.connected)
            return;
        this.abortController = new AbortController();
        // Open the SSE event stream for responses / notifications.
        try {
            const res = await fetch(this.url, {
                headers: { ...this.headers, Accept: "text/event-stream" },
                signal: this.abortController.signal,
            });
            if (!res.ok || !res.body) {
                throw new MCPTransportError("sse", `SSE connect failed: HTTP ${res.status}`);
            }
            // Read the SSE stream in the background.
            this.readStream(res.body).catch((err) => {
                if (!this.connected)
                    return; // expected on disconnect
                const message = err instanceof Error ? err.message : String(err);
                this.logger.error({ err: message }, "SSE stream error");
                this.connected = false;
                this.rejectAllPending(message);
            });
            this.connected = true;
            this.logger.info({ url: this.url }, "SSE transport connected");
        }
        catch (err) {
            if (err instanceof MCPTransportError)
                throw err;
            const message = err instanceof Error ? err.message : String(err);
            throw new MCPTransportError("sse", message);
        }
    }
    /** @inheritdoc */
    async disconnect() {
        if (!this.connected)
            return;
        this.connected = false;
        this.abortController?.abort();
        this.abortController = null;
        this.rejectAllPending("Transport disconnecting");
        this.logger.info("SSE transport disconnected");
    }
    /** @inheritdoc */
    async send(method, params) {
        if (!this.connected) {
            throw new MCPTransportError("sse", "Transport not connected");
        }
        const id = this.nextId++;
        const request = { jsonrpc: "2.0", id, method, params };
        const promise = new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
        });
        try {
            const res = await fetch(this.url, {
                method: "POST",
                headers: { ...this.headers, "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });
            if (!res.ok) {
                const pending = this.pending.get(id);
                this.pending.delete(id);
                pending?.reject(new MCPTransportError("sse", `POST failed: HTTP ${res.status}`));
            }
        }
        catch (err) {
            const pending = this.pending.get(id);
            this.pending.delete(id);
            const message = err instanceof Error ? err.message : String(err);
            pending?.reject(new MCPTransportError("sse", message));
        }
        return promise;
    }
    /** @inheritdoc */
    isConnected() {
        return this.connected;
    }
    /** @inheritdoc */
    onNotification(handler) {
        this.notificationHandlers.push(handler);
    }
    /* ------------------------------------------------------------------ */
    /*  Private helpers                                                    */
    /* ------------------------------------------------------------------ */
    async readStream(body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            for (;;) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() ?? "";
                for (const part of parts) {
                    this.handleSSEEvent(part);
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    handleSSEEvent(raw) {
        let data = "";
        for (const line of raw.split("\n")) {
            if (line.startsWith("data: ")) {
                data += line.slice(6);
            }
        }
        if (!data)
            return;
        try {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        }
        catch {
            this.logger.warn({ data }, "non-JSON SSE data");
        }
    }
    handleMessage(msg) {
        if ("id" in msg && typeof msg["id"] === "number") {
            const pending = this.pending.get(msg["id"]);
            if (!pending)
                return;
            this.pending.delete(msg["id"]);
            if ("error" in msg) {
                const err = msg["error"];
                pending.reject(new MCPTransportError("sse", err.message ?? "Unknown RPC error"));
            }
            else {
                pending.resolve(msg["result"]);
            }
            return;
        }
        if ("method" in msg && typeof msg["method"] === "string") {
            for (const handler of this.notificationHandlers) {
                handler({ method: msg["method"], params: msg["params"] });
            }
        }
    }
    rejectAllPending(reason) {
        for (const [, { reject }] of this.pending) {
            reject(new MCPTransportError("sse", reason));
        }
        this.pending.clear();
    }
}
//# sourceMappingURL=sse-transport.js.map