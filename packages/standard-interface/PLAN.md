# Standard Interface Layer (Layer 2) — Implementation Plan

## Goal
Build `packages/standard-interface/` with 8 protocol handlers (A2A, REST, WebSocket, AG-UI, A2UI, UCP, AP2, Framework Adapters), auth module, middleware stack, gateway router, tests, and a clean public API. All coded against `IStemAgent` interface from `@stem-agent/shared`.

## Dependencies
- `@stem-agent/shared` — types, errors, logger (available now)
- `@stem-agent/agent-core` — `IStemAgent` impl (blocked; we code against interface only)
- Runtime deps needed: `express`, `ws`, `swagger-ui-express`, `cors`, `compression`, `uuid`
- Dev deps needed: `supertest`, `@types/express`, `@types/ws`, `@types/cors`, `@types/compression`, `@types/supertest`, `@types/uuid`

## File Structure
```
src/
  index.ts                    — Public API exports
  gateway.ts                  — Unified Gateway entry point
  auth/
    index.ts                  — Auth module exports
    auth-middleware.ts         — Extract credentials, authenticate, attach principal
    api-key-provider.ts       — API key validation
    jwt-provider.ts           — JWT token verification
    oauth2-provider.ts        — OAuth2 token introspection
    types.ts                  — Auth provider interface
  middleware/
    index.ts                  — Middleware exports
    request-id.ts             — X-Request-Id generation + correlation
    logging.ts                — Request/response logging via pino
    cors.ts                   — CORS configuration
    compression.ts            — Response compression
    rate-limit.ts             — Token-bucket rate limiter
    error-handler.ts          — Global error handler (BaseError -> JSON)
  a2a/
    index.ts                  — A2A handler exports
    a2a-handler.ts            — JSON-RPC 2.0 dispatcher (tasks/send, get, cancel, sendSubscribe)
    agent-card-handler.ts     — GET /.well-known/agent.json
    push-notification.ts      — Webhook push notification support
  rest/
    index.ts                  — REST module exports
    rest-router.ts            — Express Router with all REST endpoints
    validation.ts             — Zod request body schemas
    openapi-spec.ts           — OpenAPI 3.1 spec object
  websocket/
    index.ts                  — WebSocket module exports
    ws-handler.ts             — WebSocket connection/message handler
    ws-events.ts              — Event type constants
    ws-room.ts                — Room-based multiplexing
  ag-ui/
    index.ts                  — AG-UI module exports
    ag-ui-handler.ts          — POST /ag-ui SSE streaming handler
  a2ui/
    index.ts                  — A2UI module exports
    a2ui-handler.ts           — POST /a2ui/render (SSE), POST /a2ui/action
  ucp/
    index.ts                  — UCP module exports
    ucp-handler.ts            — GET /.well-known/ucp, checkout lifecycle
  ap2/
    index.ts                  — AP2 module exports
    ap2-handler.ts            — Mandate lifecycle, receipts, audit trail
  adapters/
    index.ts                  — Adapter exports
    abstract-adapter.ts       — AbstractFrameworkAdapter base class
    autogen-adapter.ts        — AutoGen adapter
    crewai-adapter.ts         — CrewAI adapter
    langgraph-adapter.ts      — LangGraph adapter
    openai-agents-adapter.ts  — OpenAI Agents SDK adapter
tests/
  gateway.test.ts             — Gateway integration tests
  a2a-handler.test.ts         — A2A JSON-RPC tests
  rest-router.test.ts         — REST API tests (supertest)
  ws-handler.test.ts          — WebSocket tests
  auth-middleware.test.ts     — Auth middleware tests
  rate-limit.test.ts          — Rate limiter tests
  adapters.test.ts            — Framework adapter tests
```

## Implementation Steps

### Step 1: Update package.json with required dependencies
Add express, ws, swagger-ui-express, cors, compression, uuid and dev types.
Verify: `package.json` has all deps.

### Step 2: Auth module (`src/auth/`)
- `types.ts` — `IAuthProvider` interface with `authenticate(credential): Promise<Principal | null>`
- `api-key-provider.ts` — Validates API keys against a configurable map/store
- `jwt-provider.ts` — Verifies JWT tokens (HS256/RS256), extracts claims to Principal
- `oauth2-provider.ts` — Introspects OAuth2 tokens against a configured endpoint
- `auth-middleware.ts` — Express middleware: extracts credential from `Authorization` header / `X-API-Key`, calls registered providers, attaches `req.principal` or returns 401
- `index.ts` — re-exports

Verify: unit tests pass for each provider and middleware.

### Step 3: Middleware stack (`src/middleware/`)
- `request-id.ts` — Generates UUID request ID, sets `X-Request-Id` header
- `logging.ts` — Logs method, path, status, duration using pino
- `cors.ts` — Thin wrapper configuring cors() with options
- `compression.ts` — Thin wrapper for compression()
- `rate-limit.ts` — Token-bucket rate limiter keyed by principal ID or IP
- `error-handler.ts` — Catches thrown BaseError instances, formats JSON response
- `index.ts` — re-exports

Verify: unit tests for rate limiter and error handler.

### Step 4: A2A protocol handler (`src/a2a/`)
- `agent-card-handler.ts` — Express handler for GET `/.well-known/agent.json` calling `agent.getAgentCard()`
- `a2a-handler.ts` — Express handler for POST `/a2a`. JSON-RPC 2.0 dispatcher:
  - `tasks/send` — process task, return result
  - `tasks/sendSubscribe` — SSE streaming
  - `tasks/get` — get task status by id
  - `tasks/cancel` — cancel task
  Uses in-memory task store (Map<string, TaskRecord>).
- `push-notification.ts` — Registers webhook URLs, sends task status updates via HTTP POST
- `index.ts` — re-exports

Verify: supertest tests for each JSON-RPC method.

### Step 5: REST API (`src/rest/`)
- `validation.ts` — Zod schemas for request bodies (create task, chat, cancel)
- `rest-router.ts` — Express Router:
  - POST /api/v1/tasks — create task
  - GET /api/v1/tasks/:id — get task
  - POST /api/v1/tasks/:id/cancel — cancel task
  - GET /api/v1/tasks — list tasks
  - POST /api/v1/chat — synchronous chat
  - GET /api/v1/health — health check
  - GET /api/v1/agent-card — agent card
- `openapi-spec.ts` — OpenAPI 3.1 JSON object describing all endpoints
- `index.ts` — re-exports

Verify: supertest tests for each endpoint.

### Step 6: WebSocket handler (`src/websocket/`)
- `ws-events.ts` — Event type string constants (task.started, task.progress, task.completed, task.failed, task.cancelled, agent.thinking, tool.invoked, tool.result)
- `ws-room.ts` — Room management (join, leave, broadcast to room)
- `ws-handler.ts` — Handles WS upgrade, authentication (token query param), message dispatch, heartbeat (ping/pong), reconnection support with message replay buffer
- `index.ts` — re-exports

Verify: tests with mock WS client.

### Step 7: Framework adapters (`src/adapters/`)
- `abstract-adapter.ts` — `AbstractFrameworkAdapter` with abstract methods: `receiveTask`, `getTaskStatus`, `streamResponse`, `cancelTask`. Has `name` and `version` properties.
- `autogen-adapter.ts` — Converts AutoGen messages to/from AgentMessage
- `crewai-adapter.ts` — Converts CrewAI task format to/from AgentMessage
- `langgraph-adapter.ts` — Converts LangGraph state to/from AgentMessage
- `openai-agents-adapter.ts` — Exposes agent as OpenAI-compatible tool
- `index.ts` — re-exports base + all concrete adapters

Verify: unit tests for message conversion.

### Step 8: Gateway (`src/gateway.ts`)
- `Gateway` class: takes `IStemAgent` + config, creates Express app, mounts all middleware, mounts A2A routes, REST routes, sets up WS handler on the HTTP server.
- `start()` / `stop()` methods for lifecycle.
- Swagger UI at `/docs`.

Verify: integration test starting gateway, hitting health endpoint.

### Step 9: AG-UI protocol handler (`src/ag-ui/`)
- `ag-ui-handler.ts` — `AGUIHandler` with `POST /ag-ui` endpoint. Maps agent pipeline phases to AG-UI typed SSE events (RUN_STARTED, TEXT_MESSAGE_*, TOOL_CALL_*, REASONING_*, STATE_SNAPSHOT, STEP_*, RUN_FINISHED). Supports both full `RunAgentInput` and simple `{ message, threadId?, runId? }` payloads.
- Types defined in `shared/src/types/ag-ui.ts` (20 Zod schemas).

Verify: 13 tests for event mapping, SSE format, error handling.

### Step 10: A2UI protocol handler (`src/a2ui/`)
- `a2ui-handler.ts` — `A2UIHandler` with `POST /a2ui/render` (SSE), `POST /a2ui/action`, `GET /a2ui/surfaces`, `DELETE /a2ui/surfaces/:id`. Composes UIs from 18 component primitives using flat adjacency list model.
- Types defined in `shared/src/types/a2ui.ts` (16 primitives + server/client messages).

Verify: 14 tests for rendering, actions, surface lifecycle.

### Step 11: UCP protocol handler (`src/ucp/`)
- `ucp-handler.ts` — `UcpHandler` with `GET /.well-known/ucp` (discovery), `POST /ucp/checkout-sessions` (create), `GET /ucp/checkout-sessions/:id` (get), `POST /ucp/checkout-sessions/:id/complete` (complete). Required headers: UCP-Agent, Idempotency-Key, Request-Id. Idempotency cache. Totals computation.
- Types defined in `shared/src/types/ucp.ts` (15 schemas).

Verify: 8 tests for discovery, CRUD, idempotency, header validation.

### Step 12: AP2 protocol handler (`src/ap2/`)
- `ap2-handler.ts` — `Ap2Handler` with 7 endpoints for intent/payment mandate lifecycle, receipts, and audit trails. Auto-approve below threshold, merchant allowlist, expiry checks. `executePayment()` for programmatic receipt creation.
- Types defined in `shared/src/types/ap2.ts` (15 schemas).

Verify: 12 tests for mandate creation, approval/rejection, auto-approve, merchant validation, audit trail.

### Step 13: Public API (`src/index.ts`)
Export: Gateway, all protocol handlers (A2A, AG-UI, A2UI, UCP, AP2), AbstractFrameworkAdapter, auth module, middleware.

### Step 14: Tests
Write test suite targeting >80% coverage:
- `gateway.test.ts` — full integration
- `a2a-handler.test.ts` — JSON-RPC methods
- `rest-router.test.ts` — REST endpoints
- `ws-handler.test.ts` — WebSocket flow
- `auth-middleware.test.ts` — auth scenarios
- `rate-limit.test.ts` — rate limiting
- `adapters.test.ts` — adapter message conversion

Verify: `vitest run` passes with >80% coverage.
