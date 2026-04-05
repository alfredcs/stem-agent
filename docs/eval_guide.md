# STEM Agent — Feature Evaluation Guide

Complete evaluation guide for testing all implemented features of the STEM Agent. Each section includes test steps, expected results, and pass/fail criteria.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server & Health](#2-server--health)
3. [REST API — Chat](#3-rest-api--chat)
4. [REST API — SSE Streaming](#4-rest-api--sse-streaming)
5. [REST API — Task Lifecycle](#5-rest-api--task-lifecycle)
6. [REST API — Introspection](#6-rest-api--introspection)
7. [A2A Protocol (JSON-RPC)](#7-a2a-protocol-json-rpc)
8. [WebSocket](#8-websocket)
9. [CLI (stem-cli)](#9-cli-stem-cli)
10. [TypeScript SDK](#10-typescript-sdk)
11. [Pipeline Phases](#11-pipeline-phases)
12. [Reasoning Strategies](#12-reasoning-strategies)
13. [Memory System](#13-memory-system)
14. [MCP Tool Integration](#14-mcp-tool-integration)
15. [Cost Guardrails](#15-cost-guardrails)
16. [Caller Adaptation](#16-caller-adaptation)
17. [Multi-Agent Collaboration](#17-multi-agent-collaboration)
18. [Error Handling & Resilience](#18-error-handling--resilience)
19. [Security & Authentication](#19-security--authentication)
20. [Continuous Learning & Self-Evaluation](#20-continuous-learning--self-evaluation)
21. [Skills Acquisition](#204-skills-acquisition-cell-differentiation)

---

## 1. Prerequisites

Before running evaluations, ensure the agent is built and running:

```bash
cd stem-agent          # monorepo root (where package.json has "workspaces")
npm install
npm run build
npm start              # starts on http://localhost:8080 (per .env)
```

Verify the server is up:

```bash
curl -s http://localhost:8080/api/v1/health
# Expected: {"status":"ok","timestamp":...}
```

For full LLM evaluation, ensure `.env` has:
- `LLM_PROVIDER=amazon_bedrock` (or `anthropic`)
- Valid AWS credentials (or `ANTHROPIC_API_KEY`)
- `LLM_MAX_TOKENS=4096`

---

## 2. Server & Health

### 2.1 Health Check

```bash
curl -s http://localhost:8080/api/v1/health
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| Body | `{"status":"ok","timestamp":<number>}` |

### 2.2 Agent Card (A2A Discovery)

```bash
curl -s http://localhost:8080/.well-known/agent.json
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| `name` | `"STEM Adaptive Agent"` |
| `version` | `"0.1.0"` |
| `protocolVersion` | `"0.3.0"` |
| `capabilities.streaming` | `true` |
| `defaultInputModes` | `["text/plain"]` |

### 2.3 Agent Card (REST alias)

```bash
curl -s http://localhost:8080/api/v1/agent-card
```

| Criteria | Expected |
|---|---|
| Same content as `/.well-known/agent.json` | Yes |

---

## 3. REST API — Chat

### 3.1 Simple Question (POST /api/v1/chat)

```bash
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?", "callerId": "eval-user"}'
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| `status` | `"completed"` |
| `content` | Contains `4` (actual LLM answer, not a planning description) |
| `taskId` | Valid UUID |
| `reasoningTrace` | Non-empty array of strings |

**FAIL condition:** `content` contains generic text like "Completed chain-of-thought analysis" — this means the LLM is not configured or calls are failing.

### 3.2 Complex Question

```bash
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain the CAP theorem with examples", "callerId": "eval-user"}'
```

| Criteria | Expected |
|---|---|
| `content` | Substantive explanation mentioning Consistency, Availability, Partition Tolerance |
| Response time | Under 60 seconds |

### 3.3 Sequential Queries (Procedural Memory Reuse)

Send two different queries in sequence:

```bash
# Query 1
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Kubernetes?"}'

# Query 2
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain DNS resolution"}'
```

| Criteria | Expected |
|---|---|
| Query 1 content | About Kubernetes |
| Query 2 content | About DNS (not Kubernetes) |

**FAIL condition:** Query 2 returns content about Kubernetes — this indicates the procedural memory is leaking plans from previous queries without proper response generation.

### 3.4 Input Validation

```bash
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{}'
```

| Criteria | Expected |
|---|---|
| Status code | `400` or `422` |
| Error message | Validation error about missing `message` |

---

## 4. REST API — SSE Streaming

### 4.1 Stream Chat (GET /api/v1/chat/stream)

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Explain+quantum+computing+briefly"
```

| Criteria | Expected |
|---|---|
| Content-Type header | `text/event-stream` |
| Event count | At least 4 (perception, reasoning, planning, execution) |
| Perception event | `status: "in_progress"`, content contains `intent=` |
| Reasoning event | `status: "in_progress"`, content contains `strategy=` |
| Planning event | `status: "in_progress"`, content contains `steps` |
| Execution event | `status: "completed"`, content is an actual LLM answer |
| Final line | `data: [DONE]` |

### 4.2 Stream with Caller ID

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Hello&caller_id=eval-user"
```

| Criteria | Expected |
|---|---|
| All events have `metadata.taskId` | Yes, same UUID across all events |

---

## 5. REST API — Task Lifecycle

### 5.1 Create Task (POST /api/v1/tasks)

```bash
TASK=$(curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"message": "Analyze distributed systems", "callerId": "eval-user"}')
echo $TASK
TASK_ID=$(echo $TASK | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
```

| Criteria | Expected |
|---|---|
| `taskId` | Valid UUID |
| `status` | `"completed"` or `"in_progress"` |
| `content` | Present |

### 5.2 Get Task (GET /api/v1/tasks/:id)

```bash
curl -s http://localhost:8080/api/v1/tasks/$TASK_ID
```

| Criteria | Expected |
|---|---|
| `taskId` | Matches requested ID |
| `status` | `"completed"` |

### 5.3 List Tasks (GET /api/v1/tasks)

```bash
curl -s "http://localhost:8080/api/v1/tasks?limit=5"
```

| Criteria | Expected |
|---|---|
| Response | JSON with `tasks` array |
| Each task | Has `taskId`, `status`, `createdAt` |

### 5.4 Cancel Task (POST /api/v1/tasks/:id/cancel)

```bash
curl -s -X POST http://localhost:8080/api/v1/tasks/$TASK_ID/cancel
```

| Criteria | Expected |
|---|---|
| `status` | `"cancelled"` |

---

## 6. REST API — Introspection

### 6.1 Caller Profile (GET /api/v1/profile/:id)

```bash
curl -s http://localhost:8080/api/v1/profile/eval-user
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| Response | JSON with caller profile (style, philosophy, etc.) |

### 6.2 Behavior Parameters (GET /api/v1/behavior)

```bash
curl -s http://localhost:8080/api/v1/behavior
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| Fields | `verbosityLevel`, `reasoningDepth`, `toolUsePreference`, etc. |

### 6.3 MCP Tools (GET /api/v1/mcp/tools)

```bash
curl -s http://localhost:8080/api/v1/mcp/tools
```

| Criteria | Expected |
|---|---|
| Status code | `200` |
| Response | JSON with `tools` array (may be empty if no MCP servers configured) |

---

## 7. A2A Protocol (JSON-RPC)

### 7.1 tasks/send

```bash
curl -s -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "eval-1",
    "method": "tasks/send",
    "params": {
      "message": {
        "role": "user",
        "content": "What is machine learning?"
      }
    }
  }'
```

| Criteria | Expected |
|---|---|
| `jsonrpc` | `"2.0"` |
| `id` | `"eval-1"` |
| `result.status` | `"completed"` |
| `result.content` | Substantive answer about ML |

### 7.2 tasks/sendSubscribe (Streaming)

```bash
curl -s -N -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "eval-2",
    "method": "tasks/sendSubscribe",
    "params": {
      "message": {
        "role": "user",
        "content": "Explain REST APIs"
      }
    }
  }'
```

| Criteria | Expected |
|---|---|
| Response format | SSE stream with `data:` lines |
| Final event | Contains `status: "completed"` with content |
| Ends with | `data: [DONE]` |

### 7.3 tasks/get

```bash
curl -s -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "eval-3",
    "method": "tasks/get",
    "params": { "taskId": "<taskId-from-7.1>" }
  }'
```

| Criteria | Expected |
|---|---|
| `result.taskId` | Matches requested |
| `result.status` | `"completed"` |

### 7.4 Invalid Method

```bash
curl -s -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": "eval-4", "method": "invalid/method", "params": {}}'
```

| Criteria | Expected |
|---|---|
| `error.code` | `-32601` (METHOD_NOT_FOUND) |

### 7.5 Invalid JSON-RPC

```bash
curl -s -X POST http://localhost:8080/a2a \
  -H "Content-Type: application/json" \
  -d '{"not": "jsonrpc"}'
```

| Criteria | Expected |
|---|---|
| `error.code` | `-32600` (INVALID_REQUEST) |

---

## 8. WebSocket

### 8.1 Connect and Send Message

```javascript
// Run with: node --input-type=module <<'EOF'
const ws = new (await import('ws')).default('ws://localhost:8080/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'client.message',
    message: 'Hello from WebSocket test',
    callerId: 'ws-eval-user'
  }));
});
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`[${msg.type}]`, JSON.stringify(msg.data ?? msg).slice(0, 200));
  if (msg.type === 'task.completed' || msg.type === 'task.failed') {
    ws.close();
  }
});
ws.on('error', (err) => console.error('WS Error:', err.message));
setTimeout(() => { ws.close(); process.exit(0); }, 60000);
// EOF
```

| Criteria | Expected |
|---|---|
| Connection | Opens without error |
| Events received | `task.started`, `task.progress` (multiple), `task.completed` |
| `task.completed` payload | Contains actual answer content |

### 8.2 Heartbeat

| Criteria | Expected |
|---|---|
| Ping/Pong | Server sends ping every 30 seconds |
| Idle disconnect | Client disconnects after missing pongs |

---

## 9. CLI (stem-cli)

### 9.1 Launch CLI

```bash
cd stem-agent    # must be in monorepo root
npx stem-cli
```

| Criteria | Expected |
|---|---|
| Startup banner | `STEM Agent CLI — type /help for commands` |
| Prompt | `stem>` |

### 9.2 Chat Message

Type any text at the prompt:

```
stem> What is Docker?
```

| Criteria | Expected |
|---|---|
| Response | Actual LLM answer about Docker |

### 9.3 CLI Commands

| Command | Test | Expected |
|---|---|---|
| `/help` | Type `/help` | Lists all available commands |
| `/status` | Type `/status` | Shows caller ID, session ID, agent URL |
| `/history` | After a few messages, type `/history` | Shows conversation with timestamps |
| `/task <msg>` | Type `/task explain microservices` | Sends as task, shows response |
| `/memory` | Type `/memory` | Shows caller profile JSON |
| `/cancel` | Type `/cancel` | Prints "Cancel not yet implemented" (placeholder) |
| `/quit` | Type `/quit` | CLI exits cleanly with "Goodbye." |

### 9.4 Programmatic CLI

```typescript
// test_cli.ts
import { CLI } from '@stem-agent/caller-layer';

const cli = new CLI({
  baseUrl: 'http://localhost:8080',
  callerId: 'eval-programmatic',
});
await cli.run();
```

```bash
echo "/quit" | npx ts-node --esm test_cli.ts
```

| Criteria | Expected |
|---|---|
| Starts | Shows banner |
| `/quit` | Exits cleanly with "Goodbye." |

---

## 10. TypeScript SDK

Create `sdk_eval.ts`:

```typescript
import { StemAgentClient } from '@stem-agent/caller-layer';

const client = new StemAgentClient({ baseUrl: 'http://localhost:8080' });

// 10.1 — chat()
const res = await client.chat({ message: 'What is 2+2?', callerId: 'sdk-eval' });
console.log('10.1 chat:', res.status === 'completed' ? 'PASS' : 'FAIL', '—', String(res.content).slice(0, 80));

// 10.2 — chatStream()
let streamContent = '';
for await (const chunk of client.chatStream({ message: 'Define API briefly' })) {
  if (chunk.status === 'completed') streamContent = String(chunk.content);
}
console.log('10.2 chatStream:', streamContent.length > 20 ? 'PASS' : 'FAIL', '—', streamContent.slice(0, 80));

// 10.3 — getAgentCard()
const card = await client.getAgentCard();
console.log('10.3 getAgentCard:', card.name ? 'PASS' : 'FAIL', '—', card.name);

// 10.4 — listTools()
const tools = await client.listTools();
console.log('10.4 listTools:', Array.isArray(tools) || tools === undefined ? 'PASS' : 'FAIL');

// 10.5 — getCallerProfile()
try {
  const profile = await client.getCallerProfile('sdk-eval');
  console.log('10.5 getCallerProfile: PASS');
} catch (e) {
  console.log('10.5 getCallerProfile: FAIL —', (e as Error).message.slice(0, 80));
}

// 10.6 — getBehaviorParams()
try {
  const beh = await client.getBehaviorParams();
  console.log('10.6 getBehaviorParams:', beh.verbosityLevel !== undefined ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('10.6 getBehaviorParams: FAIL —', (e as Error).message.slice(0, 80));
}

client.close();
```

Run:

```bash
npx ts-node --esm sdk_eval.ts
```

| Test | Pass Criteria |
|---|---|
| 10.1 `chat()` | Returns `status: "completed"` with real content |
| 10.2 `chatStream()` | Streams events, final event has substantial content |
| 10.3 `getAgentCard()` | Returns card with `name` field |
| 10.4 `listTools()` | Returns array (may be empty) |
| 10.5 `getCallerProfile()` | Returns profile or 200 response |
| 10.6 `getBehaviorParams()` | Returns object with `verbosityLevel` |

---

## 11. Pipeline Phases

Each request passes through: **Perception → Adapt → Skill Match → Reasoning → Planning → Execution → Learn**

Use the streaming endpoint to observe each phase:

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Explain+quantum+computing"
```

### 11.1 Perception Phase

| Criteria | Expected |
|---|---|
| Event content | `Perceived: intent="question", complexity="..."` |
| `intent` | One of: question, command, analysis_request, creative_request, debugging, conversation, feedback, clarification |
| `complexity` | `simple`, `medium`, or `complex` |

### 11.2 Reasoning Phase

| Criteria | Expected |
|---|---|
| Event content | `Reasoned: strategy="...", confidence=X.XX` |
| `strategy` | One of: chain_of_thought, react, reflexion, internal_debate |
| `confidence` | Float between 0.0 and 1.0 |

### 11.3 Planning Phase

| Criteria | Expected |
|---|---|
| Event content | `Planned: N steps in M groups` |
| Steps | At least 1 |
| Groups | At least 1 |

### 11.4 Execution Phase

| Criteria | Expected |
|---|---|
| `status` | `"completed"` |
| `content` | Actual LLM-generated answer (not a planning description) |
| `reasoningTrace` | Array of trace strings from the reasoning phase |

---

## 12. Reasoning Strategies

### 12.1 Chain of Thought (Simple Questions)

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=What+is+the+capital+of+France"
```

| Criteria | Expected |
|---|---|
| Strategy | `chain_of_thought` |
| Complexity | `simple` |

### 12.2 ReAct (Tool-Oriented Tasks)

Requires MCP tools to be available. If tools are configured:

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Search+the+database+for+recent+orders"
```

| Criteria | Expected |
|---|---|
| Strategy | `react` (when tools are available and task involves tool use) |

### 12.3 Reflexion (Complex Analysis)

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Write+a+detailed+analysis+comparing+microservices+vs+monoliths+with+tradeoffs+and+recommendations"
```

| Criteria | Expected |
|---|---|
| Strategy | `reflexion` |
| Complexity | `complex` |

### 12.4 Internal Debate (Nuanced Topics)

```bash
curl -s -N "http://localhost:8080/api/v1/chat/stream?message=Debate+the+pros+and+cons+of+strong+AI+regulation"
```

| Criteria | Expected |
|---|---|
| Strategy | `internal_debate` (when LLM-based strategy selection is active) |

### 12.5 Automatic Strategy Selection

| Input Type | Expected Strategy |
|---|---|
| Short factual question | `chain_of_thought` |
| Task requiring tools | `react` |
| Complex multi-part analysis | `reflexion` |
| Debate/analysis with nuance | `internal_debate` |

---

## 13. Memory System

### 13.1 Episodic Memory (Learning from Interactions)

Send multiple messages, then check the profile:

```bash
# Interaction 1
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is TCP/IP?", "callerId": "mem-eval"}'

# Interaction 2
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain UDP vs TCP", "callerId": "mem-eval"}'

# Check profile
curl -s http://localhost:8080/api/v1/profile/mem-eval
```

| Criteria | Expected |
|---|---|
| Profile exists | Yes, after interactions |
| `interactionCount` | Increments with each interaction |

### 13.2 Procedural Memory (Plan Reuse)

After a successful execution, the agent stores the plan as a procedure. Subsequent similar queries should reuse it.

| Criteria | Expected |
|---|---|
| First request | Full LLM plan generation (slower) |
| Similar second request | May reuse learned procedure (faster) |
| Content still accurate | Even with plan reuse, final response is LLM-generated |

### 13.3 Caller Profile Adaptation

Send messages with different styles:

```bash
# Technical user
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain the Byzantine fault tolerance algorithm with pseudo-code and formal proofs", "callerId": "technical-user"}'

# Casual user
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hey whats kubernetes lol", "callerId": "casual-user"}'
```

| Criteria | Expected |
|---|---|
| Technical user profile | Higher `technicalDepth`, `formality` scores |
| Casual user profile | Lower `formality`, lower `technicalDepth` |

---

## 14. MCP Tool Integration

### 14.1 Tool Discovery

```bash
curl -s http://localhost:8080/api/v1/mcp/tools
```

| Criteria | Expected |
|---|---|
| Response | JSON with discovered tools |
| Each tool | Has `name`, `description` |

### 14.2 Tool Invocation via Planning

When tools are available, send a task that requires them:

```bash
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Use the available tools to help me", "callerId": "eval-user"}'
```

| Criteria | Expected |
|---|---|
| Plan includes `tool_call` steps | Yes (when tools match the request) |
| Tool results in response | Tool output is incorporated |

---

## 15. Cost Guardrails

### 15.1 Per-Interaction Limits

The cost guardrail enforces `COST_MAX_LLM_CALLS` (default 20) and `COST_MAX_PER_INTERACTION_USD` (default $0.50) per request.

| Criteria | Expected |
|---|---|
| Normal request | Completes within budget |
| Budget exceeded | Returns `BudgetExceededError` in response |

### 15.2 Daily Per-User Limits

`COST_MAX_PER_USER_DAILY_USD` (default $10.00) limits total daily spend per caller.

| Criteria | Expected |
|---|---|
| After many requests | Budget warning or error when limit reached |

### 15.3 Monthly Budget

`COST_MONTHLY_BUDGET_USD` (default $2000.00) caps total monthly spend across all callers.

### 15.4 Alert Thresholds

Budget alerts trigger at configurable thresholds (default: 50%, 75%, 90% of budget).

| Threshold | Default |
|---|---|
| Warning | 50% of budget |
| Elevated | 75% of budget |
| Critical | 90% of budget |

---

## 16. Caller Adaptation

### 16.1 Behavior Adaptation

The agent adapts its behavior based on the caller's profile:

```bash
# Check default behavior
curl -s http://localhost:8080/api/v1/behavior
```

| Parameter | Range | Default | Adapted From |
|---|---|---|---|
| `verbosityLevel` | 0-1 | 0.5 | Caller's verbosity preference |
| `reasoningDepth` | 1-6 | 3 | Caller's technical depth |
| `toolUsePreference` | 0-1 | 0.5 | Caller's pragmatism vs idealism |
| `creativityLevel` | 0-1 | 0.5 | Caller's innovation orientation |
| `confidenceThreshold` | 0-1 | 0.7 | Task complexity and urgency |
| `explorationVsExploitation` | 0-1 | 0.3 | Novelty seeking vs proven approaches |
| `proactiveSuggestion` | bool | true | Whether agent volunteers suggestions |
| `selfReflectionFrequency` | int | 5 | Reflect every N interactions |
| `maxPlanSteps` | int | 10 | Maximum plan complexity |
| `memoryRetrievalBreadth` | int | 10 | Number of memories to retrieve |

---

## 17. Multi-Agent Collaboration

### 17.1 A2A Client

```typescript
import { A2AClient } from '@stem-agent/caller-layer';

const client = new A2AClient({ endpoint: 'http://localhost:8080' });
const card = await client.discoverAgent();
console.log('Agent:', card.name, 'Skills:', card.skills?.length ?? 0);
```

| Criteria | Expected |
|---|---|
| `discoverAgent()` | Returns agent card |
| `sendTask()` | Returns completed task result |

### 17.2 Agent Registry

```typescript
import { AgentRegistry } from '@stem-agent/caller-layer';

const registry = new AgentRegistry();
registry.register('local-agent', 'http://localhost:8080', ['general']);
const agents = registry.listAgents();
const healthy = await registry.healthCheck('local-agent');
```

| Criteria | Expected |
|---|---|
| `listAgents()` | Returns array containing the registered agent |
| `healthCheck()` | Returns `true` when agent is reachable |
| `discover('local-agent')` | Returns the `AgentEntry` for that agent |

### 17.3 Collaboration Patterns

Three patterns are available:

| Pattern | Class | Description |
|---|---|---|
| Delegation | `DelegationPattern` | Coordinator splits task among agents |
| Consensus | `ConsensusPattern` | Agents vote on best solution |
| Pipeline | `PipelinePattern` | Sequential agent chain |

---

## 18. Error Handling & Resilience

### 18.1 Invalid Endpoint

```bash
curl -s http://localhost:8080/api/v1/nonexistent
```

| Criteria | Expected |
|---|---|
| Status code | `404` |

### 18.2 Malformed JSON

```bash
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d 'not json'
```

| Criteria | Expected |
|---|---|
| Status code | `400` |
| Error message | Parse/validation error |

### 18.3 Circuit Breaker

The execution engine trips a circuit breaker after `circuitBreakerThreshold` (default 3) consecutive step failures, aborting remaining steps.

| Criteria | Expected |
|---|---|
| Consecutive failures | After 3 failures, remaining steps are skipped |
| Error message | `"Circuit breaker tripped — execution aborted"` |

### 18.4 Step Retry

Each execution step is retried up to `maxExecutionRetries` (default 2) times before failing.

| Criteria | Expected |
|---|---|
| Transient failure | Retried automatically |
| Persistent failure | Falls back to `fallbackAction` if defined |

### 18.5 LLM Fallback

When the LLM is unavailable, each engine falls back to deterministic heuristics:

| Engine | LLM Mode | Heuristic Fallback |
|---|---|---|
| Perception | Structured JSON classification | Keyword-based intent + entity extraction |
| Reasoning | Full chain-of-thought | Rule-based strategy + static confidence |
| Planning | LLM-generated step plan | Heuristic single-step plan |
| Execution | LLM-generated response | Returns plan step description |

### 18.6 Graceful Shutdown

```bash
kill -SIGTERM <server-pid>
```

| Criteria | Expected |
|---|---|
| MCP connections | Closed cleanly |
| Memory manager | Shut down |
| In-flight requests | Completed before exit |

---

## 19. Security & Authentication

### 19.1 Agent Card Security Schemes

```bash
curl -s http://localhost:8080/.well-known/agent.json | python3 -c "
import sys, json
card = json.load(sys.stdin)
print('Security schemes:', json.dumps(card.get('securitySchemes', []), indent=2))
print('Security requirements:', json.dumps(card.get('security', []), indent=2))
"
```

| Criteria | Expected |
|---|---|
| `securitySchemes` | Array of supported auth schemes |
| `security` | Array of security requirements |

### 19.2 Input Sanitization

```bash
# XSS attempt
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "<script>alert(1)</script>"}'

# SQL injection attempt
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "DROP TABLE users; --"}'
```

| Criteria | Expected |
|---|---|
| XSS payload | Treated as plain text, no execution |
| SQL injection | Treated as plain text, no database impact |
| Both return | Valid response with `status: "completed"` |

### 19.3 Malformed Requests

```bash
# Oversized payload
python3 -c "import json; print(json.dumps({'message': 'x'*1000000}))" | \
  curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" -d @-
```

| Criteria | Expected |
|---|---|
| Oversized payload | Rejected or handled gracefully |

---

## 20. Continuous Learning & Self-Evaluation

### 20.1 Procedural Memory Learning

After a successful execution, the agent stores learned procedures. Verify via logs:

```bash
# Send a request and check logs for learning
curl -s -X POST http://localhost:8080/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain recursion", "callerId": "learn-eval"}'
```

| Criteria | Expected |
|---|---|
| Server logs | `"Stored learned procedure"` or similar learning message |
| Procedure stored | `procedure_<timestamp>` with `successRate: 1.0` |

### 20.2 Self-Reflection Frequency

The `selfReflectionFrequency` parameter (default: every 5 interactions) triggers periodic self-assessment.

| Criteria | Expected |
|---|---|
| After 5 interactions with same callerId | Agent may adjust behavior parameters |
| Profile update | `interactionCount` increments |

### 20.3 Batch API for Background Learning

The cost configuration includes batch API settings for deferred learning tasks.

| Setting | Default |
|---|---|
| `batchApi.enabled` | `true` |
| `batchApi.eligibleTasks` | `["learning", "consolidation", "proactive_learning", "evaluation"]` |

### 20.4 Skills Acquisition (Cell Differentiation)

The agent crystallizes reusable skills from recurring interaction patterns. Skills progress through maturity stages inspired by cell differentiation:

| Stage | Threshold | Behavior |
|---|---|---|
| **Progenitor** | Newly crystallized | Not used for shortcutting; observation only |
| **Committed** | 3+ activations, ≥60% success | Can short-circuit Reason→Plan pipeline |
| **Mature** | 10+ activations | Receives matching priority over committed |
| **Apoptosis** | <30% success after 10+ activations | Crystallized skill auto-removed |

**Verify crystallization**: after repeating similar tasks ≥3 times, check that a progenitor skill is created.

**Verify skill matching**: register a plugin skill and confirm it short-circuits the pipeline for matching intents.

### 20.5 Manual Skill Plugins

Plugin skills can be registered and removed programmatically via `SkillManager.registerPlugin()` and `removePluginByName()`. Plugin skills are exempt from apoptosis.

### 20.6 ATLAS Utility Scoring

Memory utility scores are updated via EMA after each interaction outcome. Verify:

| Criteria | Expected |
|---|---|
| Completed task → reward=1.0 | Retrieved memories' utility increases toward 1.0 |
| Failed task → reward=-0.5 | Retrieved memories' utility decreases toward -0.5 |
| EMA convergence | After 10+ interactions with reward=1.0, utility approaches ~0.95 |
| Significance detection | Outlier rewards (deviation > 0.3 from running mean) trigger immediate distillation |
| Status mapping | `completed→1.0`, `failed→-0.5`, `error→-1.0` |

**Unit tests**: `memory-system/src/__tests__/utility-tracker.test.ts` (7 tests)

### 20.7 ATLAS Utility-Biased Retrieval

Memory retrieval re-ranks candidates by composite score: `similarity + β·sigmoid(utility) + ρ·exp(-κ·age)`.

| Criteria | Expected |
|---|---|
| High-utility memory (utility=3.0) + moderate similarity (0.8) | Ranks above low-utility (utility=-2.0) + high similarity (0.9) |
| All utilities zero | Falls back to similarity-only ranking (backward compatible) |
| Over-fetch + re-rank | Search retrieves 2x candidates from store, re-ranks top K |
| Recency decay | Very old memories with low utility rank below recent ones |

**Unit tests**: `memory-system/src/__tests__/retrieval-ranker.test.ts` (5 tests)

### 20.8 ATLAS Consolidation Engine

Three-phase memory consolidation: promote, merge, prune.

| Phase | Criteria | Expected |
|---|---|---|
| **Promote** | Episodes with `utility > 0.3` | Promoted to semantic triples (grouped by embedding similarity) |
| **Promote** | Episodes with `utility < 0.3` | Skipped, remain in episodic store |
| **Merge** | Semantic triples with cosine > 0.85 | Merged into single triple with weighted-average utility |
| **Merge** | Dissimilar triples (cosine < 0.85) | Kept separate |
| **Prune** | `utility < -0.1 AND age > 7d AND retrievalCount >= 5` | Removed from store |
| **Capacity** | Episodic store > 1000 entries | Lowest-utility entries evicted to enforce bound |
| **Capacity** | Semantic store > 500 entries | Lowest-utility entries evicted to enforce bound |

**Unit tests**: `memory-system/src/__tests__/consolidation-engine.test.ts` (7 tests)

### 20.9 ATLAS Experience Distillation

Significant outcomes (outlier rewards) are immediately distilled into KnowledgeTriples without waiting for periodic consolidation.

| Criteria | Expected |
|---|---|
| Reward significantly above mean | KnowledgeTriple created: subject=callerId, predicate=intent, object=success description |
| Reward significantly below mean | KnowledgeTriple created: subject=callerId, predicate=intent, object=failure description |
| Normal reward (within threshold) | No immediate distillation (handled by periodic consolidation) |

---

## Quick Smoke Test Script

Run all critical checks in one shot:

```bash
#!/bin/bash
URL="http://localhost:8080"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "  PASS: $name"
    ((PASS++))
  else
    echo "  FAIL: $name (expected '$expected', got '${actual:0:80}')"
    ((FAIL++))
  fi
}

echo "=== STEM Agent Evaluation ==="

# Health
R=$(curl -s $URL/api/v1/health)
check "Health check" '"status":"ok"' "$R"

# Agent card
R=$(curl -s $URL/.well-known/agent.json)
check "Agent card" '"name":"STEM Adaptive Agent"' "$R"

# Chat
R=$(curl -s -X POST $URL/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is 2+2?"}')
check "Chat status" '"status":"completed"' "$R"
check "Chat has taskId" '"taskId"' "$R"

# SSE Stream
R=$(curl -s -N "$URL/api/v1/chat/stream?message=Hello" 2>&1)
check "SSE has perception" 'phase":"perception' "$R"
check "SSE has execution" 'phase":"execution' "$R"
check "SSE ends with DONE" '[DONE]' "$R"

# A2A
R=$(curl -s -X POST $URL/a2a \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"t1","method":"tasks/send","params":{"message":{"role":"user","content":"ping"}}}')
check "A2A response" '"jsonrpc":"2.0"' "$R"

# Introspection
R=$(curl -s $URL/api/v1/behavior)
check "Behavior endpoint" 'verbosityLevel' "$R"

R=$(curl -s $URL/api/v1/mcp/tools)
check "MCP tools endpoint" '200\|tools' "$R"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

Save as `scripts/eval_smoke.sh` and run:

```bash
chmod +x scripts/eval_smoke.sh
./scripts/eval_smoke.sh
```
