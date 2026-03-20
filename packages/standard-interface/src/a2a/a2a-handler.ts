import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import type { IStemAgent, AgentMessage, AgentResponse } from "@stem-agent/shared";
import type { AuthenticatedRequest } from "../auth/auth-middleware.js";

/** Internal task record stored in memory. */
interface TaskRecord {
  id: string;
  status: string;
  message: AgentMessage;
  response?: AgentResponse;
  createdAt: number;
}

/**
 * JSON-RPC 2.0 error codes per spec.
 */
const JSONRPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * A2A protocol handler implementing JSON-RPC 2.0 task lifecycle.
 * Methods: tasks/send, tasks/sendSubscribe, tasks/get, tasks/cancel.
 */
export class A2AHandler {
  private readonly tasks = new Map<string, TaskRecord>();

  constructor(private readonly agent: IStemAgent) {}

  /** Creates an Express router for the A2A endpoint at POST /a2a. */
  createRouter(): Router {
    const router = Router();

    router.post("/a2a", async (req: AuthenticatedRequest, res) => {
      const body = req.body as Record<string, unknown>;

      if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
        res.json({
          jsonrpc: "2.0",
          id: body?.id ?? null,
          error: { code: JSONRPC_ERRORS.INVALID_REQUEST, message: "Invalid JSON-RPC request" },
        });
        return;
      }

      const jsonrpcId = body.id;
      const method = body.method as string;
      const params = (body.params ?? {}) as Record<string, unknown>;
      const principal = req.principal ?? null;

      try {
        let result: unknown;

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
      } catch (err) {
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

  /** Extract text content from A2A params.message (object with content field) or flat params. */
  private extractContent(params: Record<string, unknown>): unknown {
    const msg = params.message;
    if (msg && typeof msg === "object" && "content" in msg) {
      return (msg as Record<string, unknown>).content;
    }
    return msg ?? params.content ?? "";
  }

  private async handleSend(
    params: Record<string, unknown>,
    principal: import("@stem-agent/shared").Principal | null,
  ): Promise<Record<string, unknown>> {
    const taskId = (params.taskId as string) ?? uuidv4();
    const msg = params.message as Record<string, unknown> | undefined;
    const message: AgentMessage = {
      id: uuidv4(),
      role: (msg?.role as AgentMessage["role"]) ?? "user",
      content: this.extractContent(params),
      contentType: (params.contentType as string) ?? "text/plain",
      metadata: (params.metadata as Record<string, unknown>) ?? {},
      timestamp: Date.now(),
    };

    const record: TaskRecord = {
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

  private async handleSendSubscribe(
    params: Record<string, unknown>,
    principal: import("@stem-agent/shared").Principal | null,
    res: import("express").Response,
    jsonrpcId: unknown,
  ): Promise<void> {
    const taskId = (params.taskId as string) ?? uuidv4();
    const msg = params.message as Record<string, unknown> | undefined;
    const message: AgentMessage = {
      id: uuidv4(),
      role: (msg?.role as AgentMessage["role"]) ?? "user",
      content: this.extractContent(params),
      contentType: (params.contentType as string) ?? "text/plain",
      metadata: (params.metadata as Record<string, unknown>) ?? {},
      timestamp: Date.now(),
    };

    const record: TaskRecord = {
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
    } catch (err) {
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

  private handleGet(params: Record<string, unknown>): Record<string, unknown> {
    const taskId = params.taskId as string;
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

  private handleCancel(params: Record<string, unknown>): Record<string, unknown> {
    const taskId = params.taskId as string;
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
