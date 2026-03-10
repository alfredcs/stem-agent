"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioTransport = void 0;
const node_child_process_1 = require("node:child_process");
const shared_1 = require("@stem-agent/shared");
const errors_js_1 = require("../errors.js");
/**
 * MCP transport over child-process stdio using JSON-RPC 2.0.
 *
 * Spawns the MCP server as a subprocess and communicates via
 * newline-delimited JSON on stdin/stdout.
 */
class StdioTransport {
    process = null;
    connected = false;
    nextId = 1;
    pending = new Map();
    notificationHandlers = [];
    buffer = "";
    logger;
    command;
    args;
    env;
    constructor(opts) {
        this.command = opts.command;
        this.args = opts.args ?? [];
        this.env = opts.env ?? {};
        this.logger = opts.logger ?? (0, shared_1.createLogger)("stdio-transport");
    }
    /** @inheritdoc */
    async connect() {
        if (this.connected)
            return;
        this.process = (0, node_child_process_1.spawn)(this.command, this.args, {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, ...this.env },
        });
        this.process.stdout?.on("data", (chunk) => {
            this.handleData(chunk.toString());
        });
        this.process.stderr?.on("data", (chunk) => {
            this.logger.warn({ stderr: chunk.toString() }, "server stderr");
        });
        this.process.on("exit", (code) => {
            this.connected = false;
            this.rejectAllPending(`Process exited with code ${code}`);
        });
        this.process.on("error", (err) => {
            this.connected = false;
            this.rejectAllPending(err.message);
        });
        this.connected = true;
        this.logger.info({ command: this.command }, "stdio transport connected");
    }
    /** @inheritdoc */
    async disconnect() {
        if (!this.connected || !this.process)
            return;
        this.connected = false;
        this.rejectAllPending("Transport disconnecting");
        this.process.kill("SIGTERM");
        this.process = null;
        this.logger.info("stdio transport disconnected");
    }
    /** @inheritdoc */
    async send(method, params) {
        if (!this.connected || !this.process?.stdin) {
            throw new errors_js_1.MCPTransportError("stdio", "Transport not connected");
        }
        const id = this.nextId++;
        const request = { jsonrpc: "2.0", id, method, params };
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.process.stdin.write(JSON.stringify(request) + "\n");
        });
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
    handleData(data) {
        this.buffer += data;
        const lines = this.buffer.split("\n");
        // Keep the last (possibly incomplete) segment in the buffer.
        this.buffer = lines.pop() ?? "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                const msg = JSON.parse(trimmed);
                this.handleMessage(msg);
            }
            catch {
                this.logger.warn({ line: trimmed }, "non-JSON line from server");
            }
        }
    }
    handleMessage(msg) {
        // JSON-RPC response (has id)
        if ("id" in msg && typeof msg["id"] === "number") {
            const pending = this.pending.get(msg["id"]);
            if (!pending)
                return;
            this.pending.delete(msg["id"]);
            if ("error" in msg) {
                const err = msg["error"];
                pending.reject(new errors_js_1.MCPTransportError("stdio", err.message ?? "Unknown RPC error"));
            }
            else {
                pending.resolve(msg["result"]);
            }
            return;
        }
        // Notification (no id)
        if ("method" in msg && typeof msg["method"] === "string") {
            for (const handler of this.notificationHandlers) {
                handler({ method: msg["method"], params: msg["params"] });
            }
        }
    }
    rejectAllPending(reason) {
        for (const [, { reject }] of this.pending) {
            reject(new errors_js_1.MCPTransportError("stdio", reason));
        }
        this.pending.clear();
    }
}
exports.StdioTransport = StdioTransport;
//# sourceMappingURL=stdio-transport.js.map