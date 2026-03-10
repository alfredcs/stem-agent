# Caller Layer (Layer 1) Implementation Plan

## Overview
Build `packages/caller-layer/` — the top layer that provides CLI, web dashboard, A2A client SDK, framework SDK, and agent mesh utilities for interacting with the STEM agent via the Standard Interface Layer (Layer 2).

## Key Constraint
Layer 2 (standard-interface) is not yet implemented. We define our own interfaces for the HTTP/WS gateway contracts, and import shared types from `@stem-agent/shared`. The caller layer communicates with the agent exclusively through REST (`/api/v1/chat`, `/api/v1/chat/stream`), WebSocket (`/ws`), and A2A (`/a2a`, `/.well-known/agent.json`) endpoints.

## File Structure

```
packages/caller-layer/src/
  index.ts                       # Public API exports
  human/
    cli.ts                       # Interactive REPL CLI client
  human/dashboard/
    index.html                   # SPA: chat, task manager, memory explorer, agent card viewer
  agents/
    a2a-client.ts                # A2A protocol client (JSON-RPC 2.0)
    mesh.ts                      # Agent registry, load balancing, health checking
  frameworks/
    sdk.ts                       # StemAgentClient wrapping REST + WebSocket
  __tests__/
    cli.test.ts                  # CLI tests
    a2a-client.test.ts           # A2A client tests
    mesh.test.ts                 # Agent mesh tests
    sdk.test.ts                  # SDK tests
```

Plus at monorepo root:
- `scripts/demo.sh`
- `README.md`
- Update `docker-compose.yml` (add dev/prod profiles)
- Python framework examples in `packages/caller-layer/src/frameworks/`

## Implementation Steps

### Step 1: `src/frameworks/sdk.ts` — StemAgentClient
The foundational SDK that all other modules build on.

- `StemAgentClient` class with constructor taking `{ baseUrl, wsUrl?, apiKey?, headers? }`
- Methods:
  - `chat(message, callerId?, sessionId?)` — POST `/api/v1/chat`
  - `chatStream(message, callerId?, sessionId?)` — POST `/api/v1/chat/stream`, returns `AsyncIterable<AgentResponse>` via SSE parsing
  - `connectWebSocket(callerId?, token?)` — open WS to `/ws`, returns typed send/receive
  - `getAgentCard()` — GET `/.well-known/agent.json`
  - `getCallerProfile(callerId)` — GET `/api/v1/agent/profile/{callerId}`
  - `getBehaviorParams()` — GET `/api/v1/agent/behavior`
  - `listTools()` — GET `/api/v1/mcp/tools`
  - `close()` — cleanup
- Uses native `fetch` (Node 22+) and `EventSource`-style SSE parsing
- Connection pooling via persistent `fetch` agent
- Dependency-injected logger (pino)
- Verify: unit tests with mocked fetch

### Step 2: `src/agents/a2a-client.ts` — A2AClient
A2A protocol client following JSON-RPC 2.0.

- `A2AClient` class with constructor taking `{ endpoint, apiKey? }`
- Methods:
  - `discoverAgent()` — GET `/.well-known/agent.json`, returns `AgentCard`
  - `sendTask(message)` — JSON-RPC `tasks/send`
  - `getTask(taskId)` — JSON-RPC `tasks/get`
  - `cancelTask(taskId)` — JSON-RPC `tasks/cancel`
  - `subscribeToTask(taskId)` — JSON-RPC `tasks/sendSubscribe`, returns `AsyncIterable`
- Retry with exponential backoff (configurable maxRetries, backoffMs)
- Proper JSON-RPC 2.0 error handling
- Verify: unit tests with mocked fetch

### Step 3: `src/agents/mesh.ts` — Agent Mesh
Agent registry + load balancing + health checking.

- `AgentRegistry` class:
  - `register(agentId, endpoint)` / `unregister(agentId)`
  - `discover(agentId)` — returns endpoint
  - `listAgents()` — returns all registered agents
  - `healthCheck(agentId?)` — ping agent(s), mark unhealthy
- Load balancing: round-robin selection from healthy agents
- Periodic health check loop (configurable interval)
- Failover: auto-retry on next healthy agent
- Verify: unit tests

### Step 4: `src/human/cli.ts` — CLI Client
Interactive REPL for human users.

- Uses `readline` (Node built-in) for REPL
- Commands: `/task <msg>`, `/status`, `/cancel`, `/history`, `/memory <callerId>`, `/help`, `/quit`
- Default (no command prefix) sends message via `StemAgentClient.chat()`
- Streaming output with `[thinking...]` indicator via SSE
- Conversation history stored in-memory array
- Configurable via env vars: `STEM_AGENT_URL`, `STEM_CALLER_ID`
- Shebang + bin entry in package.json
- Verify: unit tests with mocked StemAgentClient

### Step 5: `src/human/dashboard/index.html` — Web Dashboard
Single self-contained HTML file (vanilla HTML/CSS/JS).

- Chat interface with WebSocket for real-time streaming
- Task manager panel (send task, view status)
- Memory explorer (view caller profile)
- Agent Card viewer (fetch and display `/.well-known/agent.json`)
- Configurable agent URL via input field
- No build step required

### Step 6: Python Framework Examples
Self-contained Python files with inline comments.

- `src/frameworks/example-autogen.py` — AutoGen integration
- `src/frameworks/example-crewai.py` — CrewAI integration
- `src/frameworks/example-langgraph.py` — LangGraph integration

Each shows: connect to STEM agent endpoint, send task, handle response.

### Step 7: `src/index.ts` — Public API
Clean barrel exports:
- `StemAgentClient` from `./frameworks/sdk.js`
- `A2AClient` from `./agents/a2a-client.js`
- `AgentRegistry` from `./agents/mesh.js`
- CLI entry point as named export

### Step 8: Infrastructure Updates
- Update `docker-compose.yml`: add dev/prod profiles, healthcheck for stem-agent, env config
- `scripts/demo.sh`: start docker-compose, wait for healthy, run sample curl, show output
- `README.md`: ASCII architecture diagram, quickstart, config reference, API docs links

### Step 9: Test Suite
Tests for each module using vitest:
- `__tests__/sdk.test.ts` — StemAgentClient methods
- `__tests__/a2a-client.test.ts` — A2AClient JSON-RPC
- `__tests__/mesh.test.ts` — AgentRegistry, health check, load balancing
- `__tests__/cli.test.ts` — CLI command parsing, REPL flow

Target >80% coverage on all SDK/client code.

## Dependencies
- `@stem-agent/shared` — types (AgentCard, AgentMessage, AgentResponse, TaskStatus, etc.)
- `pino` — logging
- `zod` — validation
- Node 22+ built-ins: `fetch`, `readline`, `WebSocket`, `crypto`

## Verification
After each step:
1. `tsc --noEmit` passes (typecheck)
2. `vitest run` passes (unit tests)
3. No circular dependencies
