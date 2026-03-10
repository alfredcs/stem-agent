"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.A2AHandler = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
/**
 * JSON-RPC 2.0 error codes per spec.
 */
const JSONRPC_ERRORS = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INTERNAL_ERROR: -32603,
};
/**
 * A2A protocol handler implementing JSON-RPC 2.0 task lifecycle.
 * Methods: tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel.
 */
class A2AHandler {
    agent;
    tasks = new Map();
    constructor(agent) {
        this.agent = agent;
    }
    /** Creates an Express router for the A2A endpoint at POST /a2a. */
    createRouter() {
        const router = (0, express_1.Router)();
        router.post("/a2a", async (req, res) => {
            const body = req.body;
            if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
                res.json({
                    jsonrpc: "2.0",
                    id: body?.id ?? null,
                    error: { code: JSONRPC_ERRORS.INVALID_REQUEST, message: "Invalid JSON-RPC request" },
                });
                return;
            }
            const jsonrpcId = body.id;
            const method = body.method;
            const params = (body.params ?? {});
            const principal = req.principal ?? null;
            try {
                let result;
                switch (method) {
                    case "tasks/send":
                        result = await this.handleSend(params, principal);
                        break;
                    case "tasks/sendSubscribe":
                        // SSE streaming response
                        await this.handleSendSubscribe(params, principal, res, jsonrpcId);
                        return; // Response already sent as SSE
                    case "tasks/get":
                        result = this.handleGet(params);
                        break;
                    case "tasks/cancel":
                        result = this.handleCancel(params);
                        break;
                    default:
                        res.json({
                            jsonrpc: "2.0",
                            id: jsonrpcId,
                            error: { code: JSONRPC_ERRORS.METHOD_NOT_FOUND, message: `Unknown method: ${method}` },
                        });
                        return;
                }
                res.json({ jsonrpc: "2.0", id: jsonrpcId, result });
            }
            catch (err) {
                res.json({
                    jsonrpc: "2.0",
                    id: jsonrpcId,
                    error: {
                        code: JSONRPC_ERRORS.INTERNAL_ERROR,
                        message: err instanceof Error ? err.message : "Internal error",
                    },
                });
            }
        });
        return router;
    }
    async handleSend(params, principal) {
        const taskId = params.taskId ?? (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: "user",
            content: params.message ?? params.content ?? "",
            contentType: params.contentType ?? "text/plain",
            metadata: params.metadata ?? {},
            timestamp: Date.now(),
        };
        const record = {
            id: taskId,
            status: "in_progress",
            message,
            createdAt: Date.now(),
        };
        this.tasks.set(taskId, record);
        const response = await this.agent.process(taskId, message, principal);
        record.status = response.status;
        record.response = response;
        return {
            taskId,
            status: response.status,
            content: response.content,
            artifacts: response.artifacts,
            metadata: response.metadata,
        };
    }
    async handleSendSubscribe(params, principal, res, jsonrpcId) {
        const taskId = params.taskId ?? (0, uuid_1.v4)();
        const message = {
            id: (0, uuid_1.v4)(),
            role: "user",
            content: params.message ?? params.content ?? "",
            contentType: params.contentType ?? "text/plain",
            metadata: params.metadata ?? {},
            timestamp: Date.now(),
        };
        const record = {
            id: taskId,
            status: "in_progress",
            message,
            createdAt: Date.now(),
        };
        this.tasks.set(taskId, record);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        try {
            for await (const chunk of this.agent.stream(taskId, message)) {
                const event = {
                    jsonrpc: "2.0",
                    id: jsonrpcId,
                    result: {
                        taskId,
                        status: chunk.status,
                        content: chunk.content,
                        artifacts: chunk.artifacts,
                    },
                };
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
        }
        catch (err) {
            const errorEvent = {
                jsonrpc: "2.0",
                id: jsonrpcId,
                error: {
                    code: JSONRPC_ERRORS.INTERNAL_ERROR,
                    message: err instanceof Error ? err.message : "Stream error",
                },
            };
            res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
        }
        record.status = "completed";
        res.write("data: [DONE]\n\n");
        res.end();
    }
    handleGet(params) {
        const taskId = params.taskId;
        if (!taskId) {
            throw new Error("taskId is required");
        }
        const record = this.tasks.get(taskId);
        if (!record) {
            throw new Error(`Task not found: ${taskId}`);
        }
        return {
            taskId: record.id,
            status: record.status,
            content: record.response?.content,
            artifacts: record.response?.artifacts ?? [],
            metadata: record.response?.metadata ?? {},
        };
    }
    handleCancel(params) {
        const taskId = params.taskId;
        if (!taskId) {
            throw new Error("taskId is required");
        }
        const record = this.tasks.get(taskId);
        if (!record) {
            throw new Error(`Task not found: ${taskId}`);
        }
        record.status = "cancelled";
        return { taskId: record.id, status: "cancelled" };
    }
}
exports.A2AHandler = A2AHandler;
//# sourceMappingURL=a2a-handler.js.map