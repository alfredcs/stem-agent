/**
 * OpenAPI 3.1 specification for the STEM Agent REST API.
 */
export function buildOpenApiSpec(agentName: string, version: string): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: `${agentName} API`,
      version,
      description: "REST API for interacting with the STEM Agent.",
    },
    paths: {
      "/api/v1/tasks": {
        post: {
          summary: "Create a new task",
          operationId: "createTask",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTaskRequest" },
              },
            },
          },
          responses: {
            "201": {
              description: "Task created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TaskResponse" },
                },
              },
            },
          },
        },
        get: {
          summary: "List tasks",
          operationId: "listTasks",
          parameters: [
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": { description: "Task list" },
          },
        },
      },
      "/api/v1/tasks/{id}": {
        get: {
          summary: "Get task by ID",
          operationId: "getTask",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Task details" },
            "404": { description: "Task not found" },
          },
        },
      },
      "/api/v1/tasks/{id}/cancel": {
        post: {
          summary: "Cancel a task",
          operationId: "cancelTask",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Task cancelled" },
            "404": { description: "Task not found" },
          },
        },
      },
      "/api/v1/chat": {
        post: {
          summary: "Synchronous chat",
          operationId: "chat",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateTaskRequest" },
              },
            },
          },
          responses: {
            "200": { description: "Chat response" },
          },
        },
      },
      "/api/v1/health": {
        get: {
          summary: "Health check",
          operationId: "healthCheck",
          responses: {
            "200": { description: "Service is healthy" },
          },
        },
      },
      "/api/v1/agent-card": {
        get: {
          summary: "Get agent card",
          operationId: "getAgentCard",
          responses: {
            "200": { description: "Agent card" },
          },
        },
      },
      "/api/v1/chat/stream": {
        get: {
          summary: "Stream chat responses via SSE",
          operationId: "chatStream",
          parameters: [
            { name: "message", in: "query", required: true, schema: { type: "string" } },
            { name: "contentType", in: "query", schema: { type: "string" } },
            { name: "callerId", in: "query", schema: { type: "string" } },
            { name: "sessionId", in: "query", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "SSE event stream" },
          },
        },
      },
      "/api/v1/profile/{id}": {
        get: {
          summary: "Get caller profile by ID",
          operationId: "getCallerProfile",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Caller profile" },
            "501": { description: "Memory manager not available" },
          },
        },
      },
      "/api/v1/behavior": {
        get: {
          summary: "Get default behavior parameters",
          operationId: "getBehavior",
          responses: {
            "200": { description: "Default behavior parameters" },
          },
        },
      },
      "/api/v1/mcp/tools": {
        get: {
          summary: "List available MCP tools",
          operationId: "listMcpTools",
          responses: {
            "200": { description: "List of MCP tools" },
            "501": { description: "MCP manager not available" },
          },
        },
      },
    },
    components: {
      schemas: {
        CreateTaskRequest: {
          type: "object",
          properties: {
            message: { description: "Message content" },
            contentType: { type: "string", default: "text/plain" },
            callerId: { type: "string" },
            sessionId: { type: "string" },
            metadata: { type: "object" },
          },
          required: ["message"],
        },
        TaskResponse: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            status: { type: "string" },
            content: {},
            artifacts: { type: "array" },
            metadata: { type: "object" },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  };
}
