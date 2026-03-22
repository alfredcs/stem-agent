# Getting Started with STEM Agent

**Self-adapting, Tool-enabled, Extensible, Multi-agent System**

This guide walks you through installing, configuring, and running the STEM Agent, then shows how to interact with it via the CLI, REST API, WebSocket, and A2A protocol.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Running the Agent](#4-running-the-agent)
5. [Interacting with the Agent](#5-interacting-with-the-agent)
   - [CLI (Interactive REPL)](#51-cli-interactive-repl)
   - [REST API](#52-rest-api)
   - [WebSocket Streaming](#53-websocket-streaming)
   - [A2A Protocol (Agent-to-Agent)](#54-a2a-protocol-agent-to-agent)
   - [TypeScript SDK](#55-typescript-sdk)
   - [AG-UI Protocol (Frontend Streaming)](#56-ag-ui-protocol-frontend-streaming)
   - [A2UI Protocol (Dynamic UI)](#57-a2ui-protocol-dynamic-ui)
   - [UCP (Commerce)](#58-ucp-universal-commerce-protocol)
   - [AP2 (Agent Payments)](#59-ap2-agent-payments-protocol)
6. [Authentication](#6-authentication)
7. [Connecting MCP Servers](#7-connecting-mcp-servers)
8. [Multi-Agent Collaboration](#8-multi-agent-collaboration)
9. [Architecture Overview](#9-architecture-overview)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Node.js | >= 22.0.0 |
| npm | >= 10 |
| Docker & Docker Compose | For infrastructure (PostgreSQL, Redis) |

**For LLM-powered reasoning (optional but recommended):**

- **Amazon Bedrock (default)** -- AWS credentials via any standard method (IAM role, `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, or `AWS_PROFILE`) plus `AWS_REGION`.
- **Anthropic API (alternative)** -- Set `LLM_PROVIDER=anthropic` and provide `ANTHROPIC_API_KEY`.

Without credentials for either provider, the agent runs in **no-op LLM mode** using deterministic keyword-based perception and reasoning -- useful for development and testing.

**For embedding-based memory search (optional):**

- **OpenAI (default)** -- Set `OPENAI_API_KEY` for the memory system's similarity search.
- **Local (no-op)** -- Set `EMBEDDING_PROVIDER=local` to skip embeddings during development.

---

## 2. Installation

### Clone and install dependencies

```bash
cd stem-agent
npm install
```

npm workspaces will install dependencies for all five packages plus the shared library automatically.

> **Important:** All `npm` commands (build, test, start, npx) must be run from the `stem-agent/` monorepo root directory, where `package.json` with `"workspaces"` is defined. Running from the parent directory will fail to resolve `@stem-agent/*` workspace packages.

### Build all packages

```bash
npm run build
```

This compiles TypeScript across all workspaces in dependency order:

```
shared -> mcp-integration -> memory-system -> agent-core -> standard-interface -> caller-layer
```

### Run tests

```bash
npm test
```

---

## 3. Configuration

All configuration is driven by environment variables. Copy `env.example` to `.env` and edit it:

```bash
cp env.example .env
```

The full reference is in `env.example`. Below is a summary of every section.

### 3.1 LLM Provider

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `amazon_bedrock` | LLM backend: `amazon_bedrock`, `anthropic`, or `openai` |

**Amazon Bedrock (default)** -- uses the standard AWS credential chain:

| Variable | Default | Description |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock API calls |
| `AWS_ACCESS_KEY_ID` | -- | Explicit access key (option 1) |
| `AWS_SECRET_ACCESS_KEY` | -- | Explicit secret key (option 1) |
| `AWS_SESSION_TOKEN` | -- | Required only for temporary STS credentials |
| `AWS_PROFILE` | -- | Named profile from `~/.aws/credentials` (option 2) |

On EC2, ECS, or Lambda with an attached IAM role, only `AWS_REGION` is needed -- the SDK picks up credentials automatically.

**Anthropic API (alternative)** -- set `LLM_PROVIDER=anthropic`:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | -- | Required when `LLM_PROVIDER=anthropic` |

### 3.2 Model IDs

The agent uses per-phase model tiering. Override any model with these variables (Bedrock model IDs shown as defaults):

| Variable | Default | Used By |
|---|---|---|
| `LLM_MODEL_DEFAULT` | `us.anthropic.claude-sonnet-4-5-20250929-v1` | General fallback |
| `LLM_MODEL_PERCEPTION` | `us.anthropic.claude-haiku-4-5-20250929-v1` | Intent classification, entity extraction |
| `LLM_MODEL_REASONING` | `us.anthropic.claude-opus-4-6-v1` | Multi-strategy reasoning |
| `LLM_MODEL_PLANNING` | `us.anthropic.claude-opus-4-6-v1` | Execution plan generation |
| `LLM_MODEL_FORMATTING` | `us.anthropic.claude-haiku-4-5-20250929-v1` | Response formatting |
| `LLM_MODEL_EVALUATION` | `us.anthropic.claude-opus-4-6-v1` | Self-evaluation |
| `LLM_TEMPERATURE` | `0.7` | Sampling temperature (0-2) |
| `LLM_MAX_TOKENS` | `4096` | Max output tokens per call |

> **Warning:** Do not set `LLM_MAX_TOKENS` to very large values (e.g. 409600). The Anthropic SDK will reject non-streaming requests that may exceed 10 minutes, causing all LLM calls to fail silently with fallback to heuristics. Keep this at 4096 or use a reasonable value for your use case.

### 3.3 Embedding

The memory system uses embeddings for similarity search across episodic, semantic, and procedural memory.

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_PROVIDER` | `openai` | `openai`, `bedrock` (planned), or `local` (no-op) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model name |
| `OPENAI_API_KEY` | -- | Required when `EMBEDDING_PROVIDER=openai` |
| `EMBEDDING_API_KEY` | -- | Alternative to `OPENAI_API_KEY` |

Set `EMBEDDING_PROVIDER=local` during development to skip embedding API calls entirely (uses zero vectors).

### 3.4 Infrastructure

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://stem:stemdev@localhost:5432/stem_agent` | PostgreSQL + pgvector connection |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection |

### 3.5 Server

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Bind address |
| `PORT` | `8080` | HTTP port |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |
| `NODE_ENV` | `development` | `development` or `production` |
| `MAX_CONCURRENT_TASKS` | `10` | Max parallel task processing |

### 3.6 Agent Identity

| Variable | Default | Description |
|---|---|---|
| `AGENT_ID` | `stem-agent-001` | Unique agent identifier |
| `AGENT_NAME` | `STEM Adaptive Agent` | Human-readable name (appears in agent card) |
| `AGENT_VERSION` | `0.1.0` | Semantic version |
| `AGENT_DESCRIPTION` | `Self-adaptive general-purpose agent` | Description in agent card |

### 3.7 Cost Guardrails

Built-in budget controls prevent runaway LLM costs:

| Variable | Default | Description |
|---|---|---|
| `COST_MAX_LLM_CALLS` | `20` | Hard cap on LLM calls per request |
| `COST_MAX_PER_INTERACTION_USD` | `0.50` | Dollar limit per request |
| `COST_MAX_PER_USER_DAILY_USD` | `10.00` | Dollar limit per user per day |
| `COST_MONTHLY_BUDGET_USD` | `2000.00` | Monthly total cap |

### 3.8 CLI Client

| Variable | Default | Description |
|---|---|---|
| `STEM_AGENT_URL` | `http://localhost:8080` | Agent endpoint for the CLI |
| `STEM_CALLER_ID` | *(random UUID)* | Default caller identity |

### 3.9 Agent Core Tuning

These are set programmatically via the `AgentCoreConfig` schema (not env vars):

| Parameter | Default | Description |
|---|---|---|
| `maxReasoningSteps` | 6 | Maximum steps per reasoning cycle |
| `maxPlanSteps` | 10 | Maximum steps in an execution plan |
| `maxExecutionRetries` | 2 | Retries per failed execution step |
| `parallelExecution` | true | Run independent plan steps in parallel |
| `planApprovalRequired` | false | Require human approval before execution |
| `circuitBreakerThreshold` | 3 | Consecutive failures before circuit opens |
| `stepTimeoutMs` | 30000 | Per-step timeout in milliseconds |
| `confidenceThreshold` | 0.7 | Minimum confidence to proceed without re-reasoning |

---

## 4. Running the Agent

### Option A: Docker Compose (recommended)

Start the full stack -- PostgreSQL (with pgvector), Redis, and the agent:

```bash
# Production mode
docker compose --profile prod up --build

# Development mode (adds pgAdmin at http://localhost:5050)
docker compose --profile dev up --build
```

The agent will be available at `http://localhost:8080`.

### Option B: Infrastructure via Docker, agent locally

Start only the backing services (PostgreSQL is required; Redis is optional if you already have a local instance):

```bash
docker compose up postgres redis
```

> **Note:** If you already have Redis running locally (e.g. as a system service), the Docker Redis container will fail to bind port 6379. In that case just start PostgreSQL: `docker compose up postgres`

Then build and run the agent:

```bash
npm run build
npm start
```

This loads `.env` automatically and starts the gateway on `http://${HOST}:${PORT}`.

### Option C: Development mode

```bash
npm run dev
```

### Verify the agent is running

```bash
curl http://localhost:8080/.well-known/agent.json
```

This returns the agent card -- the A2A v0.3.0 discovery document describing the agent's capabilities, supported protocols, and security schemes.

Health check:

```bash
curl http://localhost:8080/api/v1/health
```

---

## 5. Interacting with the Agent

### 5.1 CLI (Interactive REPL)

The `@stem-agent/caller-layer` package ships with an interactive CLI.

```bash
# After building, link the CLI globally
npx stem-cli
```

Or use it programmatically:

```typescript
import { CLI } from '@stem-agent/caller-layer';

const cli = new CLI({
  baseUrl: 'http://localhost:8080',  // or set STEM_AGENT_URL
  callerId: 'my-user',              // or set STEM_CALLER_ID
});
await cli.run();
```

**CLI commands:**

| Command | Description |
|---|---|
| (any text) | Send a message to the agent |
| `/task <msg>` | Send a task explicitly |
| `/status` | Show connection info |
| `/cancel` | Cancel the current task |
| `/history` | View conversation history |
| `/memory [id]` | Show caller profile |
| `/help` | List available commands |
| `/quit` | Exit the CLI |

---

### 5.2 REST API

#### Send a chat message

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What design patterns are used in microservice architectures?",
    "callerId": "user-123",
    "sessionId": "session-abc"
  }'
```

Response:

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "content": "...",
  "artifacts": [],
  "reasoningTrace": ["Step 1: ...", "Step 2: ..."]
}
```

#### Create and track a task

```bash
# Create
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze this dataset", "callerId": "user-123"}'

# Poll status
curl http://localhost:8080/api/v1/tasks/{taskId}

# List all tasks
curl "http://localhost:8080/api/v1/tasks?status=completed&limit=10"

# Cancel
curl -X POST http://localhost:8080/api/v1/tasks/{taskId}/cancel
```

#### Streaming via SSE

```bash
curl -N "http://localhost:8080/api/v1/chat/stream?message=Explain+quantum+computing"
```

Returns a server-sent event stream with incremental progress updates.

#### Other endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/agent-card` | Agent card (same as `/.well-known/agent.json`) |
| `GET` | `/api/v1/profile/:id` | Caller profile (learned preferences) |
| `GET` | `/api/v1/behavior` | Current default behavior parameters |
| `GET` | `/api/v1/mcp/tools` | List available MCP tools |
| `GET` | `/api-docs` | OpenAPI specification |
| `GET` | `/docs` | Swagger UI |

---

### 5.3 WebSocket Streaming

Connect to `ws://localhost:8080/ws` for real-time bidirectional communication.

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Send a task
  ws.send(JSON.stringify({
    type: 'client.message',
    message: 'Summarize recent AI research trends',
    callerId: 'user-123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Event types: task.started, task.progress, agent.thinking,
  //              tool.invoked, tool.result, task.completed, task.failed
  console.log(`[${data.type}]`, data.data);
  if (data.type === 'task.completed' || data.type === 'task.failed') {
    ws.close();
  }
};
```

**WebSocket event types:**

| Event | Direction | Description |
|---|---|---|
| `client.message` | client -> server | Submit a task |
| `client.join_room` | client -> server | Join a named room |
| `client.leave_room` | client -> server | Leave a room |
| `ping` / `pong` | bidirectional | Heartbeat (auto every 30s) |
| `task.started` | server -> client | Task processing began |
| `task.progress` | server -> client | Intermediate progress |
| `agent.thinking` | server -> client | Reasoning phase update |
| `tool.invoked` | server -> client | MCP tool call started |
| `tool.result` | server -> client | MCP tool call result |
| `task.completed` | server -> client | Final result |
| `task.failed` | server -> client | Error |

If authentication is enabled, pass the token as a query parameter: `ws://localhost:8080/ws?token=<your-token>`.

---

### 5.4 A2A Protocol (Agent-to-Agent)

The agent exposes a JSON-RPC 2.0 endpoint at `POST /a2a` following the A2A v0.3.0 specification.

#### Discover the agent

```bash
curl http://localhost:8080/.well-known/agent.json
```

#### Send a task via JSON-RPC

```bash
curl -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-1",
    "method": "tasks/send",
    "params": {
      "message": {
        "role": "user",
        "content": "Analyze the performance of this API endpoint"
      }
    }
  }'
```

**Available JSON-RPC methods:**

| Method | Description |
|---|---|
| `tasks/send` | Send a task and receive the full result |
| `tasks/sendSubscribe` | Send a task and stream results via SSE |
| `tasks/get` | Get status/result of an existing task |
| `tasks/cancel` | Cancel a running task |

#### Using the A2A client

```typescript
import { A2AClient } from '@stem-agent/caller-layer';

const client = new A2AClient({ endpoint: 'http://localhost:8080' });

// Discover capabilities
const card = await client.discoverAgent();
console.log('Agent:', card.name, '| Skills:', card.skills?.length ?? 0);

// Send a task
const result = await client.sendTask({ content: 'Analyze this data' });
console.log('Result:', result.status, '—', String(result.content).slice(0, 200));

// Stream a task
for await (const update of client.subscribeToTask({ content: 'Long-running analysis' })) {
  console.log('Update:', update.status, '—', String(update.content).slice(0, 100));
}
```

---

### 5.5 TypeScript SDK

The `StemAgentClient` provides a high-level client covering REST and WebSocket.

```typescript
import { StemAgentClient } from '@stem-agent/caller-layer';

const client = new StemAgentClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-api-key',  // optional, if auth is enabled
});

// Simple chat (POST /api/v1/chat)
const response = await client.chat({
  message: 'Explain the CAP theorem',
  callerId: 'user-123',
});
console.log(response.content);

// Streaming chat (GET /api/v1/chat/stream via SSE)
for await (const chunk of client.chatStream({
  message: 'Write a detailed analysis of distributed systems',
})) {
  if (chunk.status === 'completed') {
    console.log(chunk.content);
  }
}

// Introspection
const card = await client.getAgentCard();       // GET /.well-known/agent.json
const tools = await client.listTools();          // GET /api/v1/mcp/tools
const profile = await client.getCallerProfile('user-123');  // GET /api/v1/profile/:id
const behavior = await client.getBehaviorParams();           // GET /api/v1/behavior

// WebSocket (ws://host/ws)
// send() safely buffers until the connection is open
const ws = client.connectWebSocket();
ws.send({ message: 'Hello via WebSocket', callerId: 'user-123' });
for await (const msg of ws.messages()) {
  console.log(`[${msg.type}]`, msg.content);
  if (msg.type === 'task.completed' || msg.type === 'task.failed') break;
}
ws.close();

// Clean up all connections
client.close();
```

**Available SDK methods:**

| Method | Maps to | Description |
|---|---|---|
| `chat(req)` | `POST /api/v1/chat` | Send message, receive full response |
| `chatStream(req)` | `GET /api/v1/chat/stream` | Stream partial responses via SSE |
| `getAgentCard()` | `GET /.well-known/agent.json` | Fetch agent capabilities card |
| `listTools()` | `GET /api/v1/mcp/tools` | List available MCP tools |
| `getCallerProfile(id)` | `GET /api/v1/profile/:id` | Fetch learned caller profile |
| `getBehaviorParams()` | `GET /api/v1/behavior` | Fetch current behavior parameters |
| `connectWebSocket(token?)` | `ws://host/ws` | Open WebSocket connection |
| `close()` | -- | Close all active WebSocket connections |

---

### 5.6 AG-UI Protocol (Frontend Streaming)

The AG-UI endpoint provides standardized SSE streaming of agent execution events, designed for frontend consumption.

```bash
curl -N -X POST http://localhost:8080/ag-ui \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze this dataset", "threadId": "thread-1"}'
```

Returns typed SSE events mapping to agent pipeline phases:

| Event | Description |
|---|---|
| `RUN_STARTED` | Agent run begins |
| `TEXT_MESSAGE_START/CONTENT/END` | Streamed text output |
| `TOOL_CALL_START/ARGS/END` | Tool invocations |
| `REASONING_MESSAGE` | Reasoning phase updates |
| `STATE_SNAPSHOT` | Planning phase state |
| `STEP_STARTED/FINISHED` | Pipeline phase boundaries |
| `RUN_FINISHED` | Agent run complete |

---

### 5.7 A2UI Protocol (Dynamic UI)

A2UI enables the agent to compose dynamic UIs from 18 component primitives (text, button, card, list, text_field, checkbox, etc.).

```bash
# Render a surface
curl -N -X POST http://localhost:8080/a2ui/render \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Show a settings panel", "callerId": "user-123"}'

# Send a user action
curl -X POST http://localhost:8080/a2ui/action \
  -H "Content-Type: application/json" \
  -d '{"type": "userAction", "surfaceId": "surf_abc", "componentId": "btn-save", "action": "click"}'
```

The render endpoint streams SSE events: `beginRendering`, `surfaceUpdate`, `dataModelUpdate`.

---

### 5.8 UCP (Universal Commerce Protocol)

UCP adds commerce capabilities with a checkout lifecycle.

```bash
# Discover UCP capabilities
curl http://localhost:8080/.well-known/ucp

# Create a checkout session
curl -X POST http://localhost:8080/ucp/checkout-sessions \
  -H "Content-Type: application/json" \
  -H "UCP-Agent: my-agent" \
  -H "Idempotency-Key: idem-1" \
  -H "Request-Id: req-1" \
  -d '{
    "lineItems": [
      {"name": "Widget", "quantity": 2, "unitPrice": {"amount": "19.99", "currency": "USD"}}
    ]
  }'

# Complete checkout
curl -X POST http://localhost:8080/ucp/checkout-sessions/{id}/complete \
  -H "UCP-Agent: my-agent" \
  -H "Idempotency-Key: idem-2" \
  -H "Request-Id: req-2" \
  -H "Content-Type: application/json" \
  -d '{"payment": {"method": "card"}}'
```

---

### 5.9 AP2 (Agent Payments Protocol)

AP2 provides a mandate-based payment authorization flow: Intent Mandate (owner sets guardrails) -> Payment Mandate (agent binds to intent) -> Payment Receipt.

```bash
# Step 1: Create an intent mandate (owner sets budget + allowed merchants)
INTENT=$(curl -s -X POST http://localhost:8080/ap2/mandates/intent \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "maxAmount": {"amount": "100.00", "currency": "USD"},
    "allowedMerchants": ["merchant-A"],
    "autoApproveBelow": {"amount": "25.00", "currency": "USD"},
    "expiresAt": 1900000000000,
    "status": "active"
  }')
echo "$INTENT"
INTENT_ID=$(echo "$INTENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Step 2: Create a payment mandate (agent requests payment)
# Since $20 < $25 autoApproveBelow, this will be auto-approved
PAYMENT=$(curl -s -X POST http://localhost:8080/ap2/mandates/payment \
  -H "Content-Type: application/json" \
  -d "{
    \"intentMandateId\": \"$INTENT_ID\",
    \"agentId\": \"stem-agent-001\",
    \"merchantId\": \"merchant-A\",
    \"totalAmount\": {\"amount\": \"20.00\", \"currency\": \"USD\"},
    \"items\": [{\"name\": \"Service\", \"unitPrice\": {\"amount\": \"20.00\", \"currency\": \"USD\"}}]
  }")
echo "$PAYMENT"
# status will be "approved" (auto-approved, below $25 threshold)

# Step 3: View audit trail (intent -> payments -> receipts)
curl -s http://localhost:8080/ap2/audit/$INTENT_ID | python3 -m json.tool
```

**Key behaviors:**
- Payments below `autoApproveBelow` are auto-approved (same currency required)
- Payments above the threshold start as `pending_approval` and require `POST /ap2/mandates/payment/{id}/approve`
- Merchants must be in `allowedMerchants` (empty list = allow all)
- Payment currency must match intent currency
- Expired or revoked intents return 403

---

## 6. Authentication

The agent supports multiple authentication protocols, configured via the gateway. When security is disabled (default in development), all endpoints are open.

### API Key

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "X-API-Key: sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### JWT Bearer Token

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "callerId": "user-123"}'
```

### OAuth2

```bash
curl -X POST http://localhost:8080/api/v1/chat \
  -H "Authorization: Bearer <oauth2_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

Supported protocols: JWT, OAuth2, SAML, API Key, Bearer Token, mTLS (planned). See [SECURITY_ADDITION.md](SECURITY_ADDITION.md) for full configuration details.

---

## 7. Connecting MCP Servers

The agent gains domain-specific capabilities by connecting to MCP (Model Context Protocol) servers. Five server types are supported out of the box:

| Server Type | Description | Example Use |
|---|---|---|
| `DatabaseServer` | Parameterized SQL queries | Query application databases |
| `APIServer` | HTTP API endpoints | Call external REST services |
| `FileServer` | File system access | Read/write local files |
| `ToolServer` | Execute processes/scripts | Run shell commands, scripts |
| `CustomServer` | User-defined servers | Any custom MCP server |

MCP servers connect via **stdio** or **SSE** transport. Once connected, the agent automatically discovers available tools and routes invocations through its planning and execution engines.

```bash
# List discovered MCP tools
curl http://localhost:8080/api/v1/mcp/tools
```

---

## 8. Multi-Agent Collaboration

STEM agents can collaborate with other agents using three built-in patterns:

### Delegation

A coordinator decomposes a task, assigns subtasks to specialist agents, and aggregates results.

```typescript
import { A2AClient, AgentRegistry } from '@stem-agent/caller-layer';

const registry = new AgentRegistry();
await registry.discover('http://analyst-agent:8080');
await registry.discover('http://writer-agent:8080');

// The STEM agent can delegate subtasks to discovered agents
```

### Consensus

Multiple agents evaluate the same problem independently and vote on the best solution, weighted by confidence.

### Pipeline

Agents are chained sequentially -- the output of one becomes the input of the next, each specializing in a transformation stage.

Framework adapters for **AutoGen**, **CrewAI**, **LangGraph**, and **OpenAI Agents SDK** allow STEM agents to participate in orchestrated multi-agent workflows natively.

---

## 9. Architecture Overview

The STEM Agent is a layered system with five packages:

```
+-------------------------------------------------------+
|  Layer 1: Caller Layer (@stem-agent/caller-layer)      |
|  CLI, TypeScript SDK, A2A Client, Framework SDKs       |
+-------------------------------------------------------+
|  Layer 2: Standard Interface                           |
|  (@stem-agent/standard-interface)                      |
|  Gateway: REST, WebSocket, A2A, AG-UI, A2UI, UCP, AP2  |
+-------------------------------------------------------+
|  Layer 3: Agent Core (@stem-agent/agent-core)          |
|  Perception -> Skill Match -> Reasoning -> Planning -> Execution |
+-------------------------------------------------------+
|  Layer 4: Memory System (@stem-agent/memory-system)    |
|  Episodic, Semantic, Procedural, User Context          |
+-------------------------------------------------------+
|  Layer 5: MCP Integration                              |
|  (@stem-agent/mcp-integration)                         |
|  Database, API, File, Tool, Custom MCP Servers         |
+-------------------------------------------------------+
```

### Processing pipeline

Every request flows through the cognitive loop:

```
Input -> PERCEIVE -> ADAPT -> SKILL MATCH -> REASON -> PLAN -> EXECUTE -> LEARN -> Response
```

1. **Perceive** -- Classify intent, extract entities, assess complexity and urgency
2. **Adapt** -- Load the caller's profile, tune behavior parameters to their preferences
3. **Skill Match** -- Check acquired skills; if a committed/mature skill matches, short-circuit to its pre-built plan
4. **Reason** -- Select and apply a reasoning strategy (Chain-of-Thought, ReAct, Reflexion, Internal Debate)
5. **Plan** -- Generate an execution plan with tool calls, dependencies, and parallelization
6. **Execute** -- Run the plan via MCP tools, with retry and fallback logic
7. **Learn** -- Store the episode in memory, update the caller profile, record skill outcomes, attempt skill crystallization

### Reasoning strategies

| Strategy | Best For | Description |
|---|---|---|
| Chain of Thought | General queries | Sequential step-by-step reasoning |
| ReAct | Tool-using tasks | Reasoning + acting + observing in loops |
| Reflexion | High-complexity tasks | Self-reflection and iterative refinement |
| Internal Debate | Analysis, nuanced topics | Multiple perspectives synthesized |

The strategy is selected automatically based on task complexity, intent, and whether tools are required.

### Memory system

The agent maintains four persistent memory layers backed by PostgreSQL + pgvector:

| Layer | Purpose | Example |
|---|---|---|
| **Episodic** | Past interactions and outcomes | "Last time user-123 asked about X, they preferred..." |
| **Semantic** | Learned facts and knowledge | Domain knowledge extracted from interactions |
| **Procedural** | Strategies and procedures | "For data analysis tasks, plan A works best" |
| **User Context** | Caller profiles | Philosophy, principles, style, habits per caller |

---

## 10. Troubleshooting

### Agent starts but LLM calls return stubs

The agent falls back to `NoOpLLMClient` (deterministic placeholder responses) when it cannot detect credentials for the configured `LLM_PROVIDER`. Fix by ensuring credentials are available:

- **Bedrock (default):** Set `AWS_REGION` plus one of: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, `AWS_PROFILE`, or run on an EC2/ECS instance with an IAM role. The Bedrock integration requires the `@anthropic-ai/bedrock-sdk` package — ensure it is installed (`npm install @anthropic-ai/bedrock-sdk`).
- **Anthropic:** Set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`.

### LLM calls fail with "Streaming is required"

If server logs show `Streaming is required for operations that may take longer than 10 minutes`, the `LLM_MAX_TOKENS` value in `.env` is too high. The Anthropic SDK estimates request duration from max_tokens and rejects non-streaming calls that could exceed 10 minutes. Set `LLM_MAX_TOKENS=4096` (or another reasonable value) in `.env`.

### Responses are generic placeholders despite LLM being configured

If the agent returns text like "Completed chain-of-thought analysis..." instead of real answers, check server logs for LLM errors. Common causes:

1. **Bedrock SDK not installed** — Run `npm install @anthropic-ai/bedrock-sdk` from the monorepo root
2. **`LLM_MAX_TOKENS` too large** — Reduce to 4096 in `.env`
3. **AWS credentials expired** — Verify with `aws sts get-caller-identity`
4. **Model ID incorrect** — Ensure Bedrock model IDs match your enabled models in the AWS console

### Embeddings return zero vectors

The memory system falls back to `NoOpEmbeddingProvider` when no embedding API key is available. Set `OPENAI_API_KEY` (or `EMBEDDING_API_KEY`) when `EMBEDDING_PROVIDER=openai`, or set `EMBEDDING_PROVIDER=local` to silence the warning during development.

### Cannot connect to PostgreSQL

Check that the database is running and `DATABASE_URL` is correct:

```bash
docker compose up postgres
pg_isready -h localhost -p 5432 -U stem
```

### Port 8080 already in use

The gateway listens on the `PORT` env var (default 8080). Set `PORT=9000` in `.env` to use a different port, or stop the conflicting process.

### WebSocket connection drops

The server sends heartbeat pings every 30 seconds. Ensure your client responds to ping frames. If connecting through a proxy, verify it supports WebSocket upgrades.

### Rate limiting

If you receive HTTP 429 responses, the rate limiter is active. This is per-IP by default. Adjust via gateway configuration or disable for development.

### Docker healthcheck failing

The agent healthcheck hits `/.well-known/agent.json`. If the container reports unhealthy, check logs:

```bash
docker compose logs stem-agent
```

---

## Next Steps

- Read the full [Design Document](stem-agent-design.md) for deep architectural details
- Review [Security Configuration](SECURITY_ADDITION.md) for enterprise auth setup
- Explore the OpenAPI docs at `http://localhost:8080/docs` once the agent is running
- Check individual package `PLAN.md` files under `packages/*/` for per-module design notes
