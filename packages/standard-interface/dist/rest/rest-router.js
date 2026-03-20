import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { ValidationError, BehaviorParametersSchema } from "@stem-agent/shared";
import { CreateTaskSchema, ListTasksQuerySchema } from "./validation.js";
/**
 * Creates the Express router for all REST API v1 endpoints.
 */
export function restRouter(deps) {
    const { agent, memoryManager, mcpManager } = deps;
    const router = Router();
    const tasks = new Map();
    /**
     * POST /api/v1/tasks — Create and process a new task.
     */
    router.post("/api/v1/tasks", async (req, res, next) => {
        try {
            const parsed = CreateTaskSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new ValidationError("Invalid request body", {
                    issues: parsed.error.issues,
                });
            }
            const body = parsed.data;
            const taskId = uuidv4();
            const message = {
                id: uuidv4(),
                role: "user",
                content: body.message,
                contentType: body.contentType,
                callerId: body.callerId,
                sessionId: body.sessionId,
                metadata: body.metadata,
                timestamp: Date.now(),
            };
            const record = {
                id: taskId,
                status: "in_progress",
                message,
                createdAt: Date.now(),
            };
            tasks.set(taskId, record);
            const response = await agent.process(taskId, message, req.principal ?? null);
            record.status = response.status;
            record.response = response;
            res.status(201).json({
                taskId,
                status: response.status,
                content: response.content,
                artifacts: response.artifacts,
                metadata: response.metadata,
            });
        }
        catch (err) {
            next(err);
        }
    });
    /**
     * GET /api/v1/tasks/:id — Get task by ID.
     */
    router.get("/api/v1/tasks/:id", (req, res) => {
        const record = tasks.get(req.params.id);
        if (!record) {
            res.status(404).json({ error: "Task not found" });
            return;
        }
        res.json({
            taskId: record.id,
            status: record.status,
            content: record.response?.content,
            artifacts: record.response?.artifacts ?? [],
            metadata: record.response?.metadata ?? {},
            createdAt: record.createdAt,
        });
    });
    /**
     * POST /api/v1/tasks/:id/cancel — Cancel a task.
     */
    router.post("/api/v1/tasks/:id/cancel", (req, res) => {
        const record = tasks.get(req.params.id);
        if (!record) {
            res.status(404).json({ error: "Task not found" });
            return;
        }
        record.status = "cancelled";
        res.json({ taskId: record.id, status: "cancelled" });
    });
    /**
     * GET /api/v1/tasks — List tasks with optional filtering.
     */
    router.get("/api/v1/tasks", (req, res, next) => {
        try {
            const parsed = ListTasksQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                throw new ValidationError("Invalid query parameters", {
                    issues: parsed.error.issues,
                });
            }
            const { status, limit, offset } = parsed.data;
            let records = Array.from(tasks.values());
            if (status) {
                records = records.filter((r) => r.status === status);
            }
            const total = records.length;
            records = records.slice(offset, offset + limit);
            res.json({
                tasks: records.map((r) => ({
                    taskId: r.id,
                    status: r.status,
                    createdAt: r.createdAt,
                })),
                total,
                limit,
                offset,
            });
        }
        catch (err) {
            next(err);
        }
    });
    /**
     * POST /api/v1/chat — Synchronous chat endpoint.
     */
    router.post("/api/v1/chat", async (req, res, next) => {
        try {
            const parsed = CreateTaskSchema.safeParse(req.body);
            if (!parsed.success) {
                throw new ValidationError("Invalid request body", {
                    issues: parsed.error.issues,
                });
            }
            const body = parsed.data;
            const taskId = uuidv4();
            const message = {
                id: uuidv4(),
                role: "user",
                content: body.message,
                contentType: body.contentType,
                callerId: body.callerId,
                sessionId: body.sessionId,
                metadata: body.metadata,
                timestamp: Date.now(),
            };
            const response = await agent.process(taskId, message, req.principal ?? null);
            res.json({
                taskId,
                status: response.status,
                content: response.content,
                reasoningTrace: response.reasoningTrace,
            });
        }
        catch (err) {
            next(err);
        }
    });
    /**
     * GET /api/v1/health — Health check.
     */
    router.get("/api/v1/health", (_req, res) => {
        res.json({ status: "ok", timestamp: Date.now() });
    });
    /**
     * GET /api/v1/agent-card — Agent card in native format.
     */
    router.get("/api/v1/agent-card", (_req, res) => {
        res.json(agent.getAgentCard());
    });
    /**
     * GET /api/v1/chat/stream — SSE streaming endpoint.
     */
    router.get("/api/v1/chat/stream", async (req, res, next) => {
        try {
            const message = req.query.message;
            if (!message || typeof message !== "string") {
                throw new ValidationError("Missing 'message' query parameter");
            }
            const taskId = uuidv4();
            const agentMessage = {
                id: uuidv4(),
                role: "user",
                content: message,
                contentType: req.query.contentType ?? "text/plain",
                callerId: req.query.callerId,
                sessionId: req.query.sessionId,
                metadata: {},
                timestamp: Date.now(),
            };
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            });
            for await (const response of agent.stream(taskId, agentMessage)) {
                res.write(`data: ${JSON.stringify(response)}\n\n`);
            }
            res.write("data: [DONE]\n\n");
            res.end();
        }
        catch (err) {
            next(err);
        }
    });
    /**
     * GET /api/v1/profile/:id — Caller profile.
     */
    router.get("/api/v1/profile/:id", async (req, res, next) => {
        try {
            if (!memoryManager) {
                res.status(501).json({ error: "Memory manager not available" });
                return;
            }
            const profile = await memoryManager.getCallerProfile(req.params.id);
            res.json(profile);
        }
        catch (err) {
            next(err);
        }
    });
    /**
     * GET /api/v1/behavior — Default behavior parameters.
     */
    router.get("/api/v1/behavior", (_req, res) => {
        res.json(BehaviorParametersSchema.parse({}));
    });
    /**
     * GET /api/v1/mcp/tools — MCP tools.
     */
    router.get("/api/v1/mcp/tools", async (_req, res, next) => {
        try {
            if (!mcpManager) {
                res.status(501).json({ error: "MCP manager not available" });
                return;
            }
            const tools = await mcpManager.discoverCapabilities();
            res.json(tools);
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=rest-router.js.map