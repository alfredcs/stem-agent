# Agent Core (Layer 3) — Implementation Plan

## Overview

Build `packages/agent-core/` implementing the 4-engine pipeline (Perception, Reasoning, Planning, Execution) plus the orchestrator that wires them together. All external dependencies are coded against `IMCPManager` and `IMemoryManager` interfaces from `@stem-agent/shared`.

## File Structure

```
packages/agent-core/src/
├── index.ts                    # Public API exports
├── config.ts                   # AgentCoreConfig (engine-specific knobs)
├── orchestrator.ts             # StemAgent: implements IStemAgent, main loop
├── perception/
│   ├── index.ts                # re-export
│   └── perception-engine.ts    # PerceptionEngine class
├── reasoning/
│   ├── index.ts                # re-export
│   ├── reasoning-engine.ts     # ReasoningEngine class
│   └── strategy-selector.ts    # StrategySelector (selects reasoning strategy)
├── planning/
│   ├── index.ts                # re-export
│   └── planning-engine.ts      # PlanningEngine class
├── execution/
│   ├── index.ts                # re-export
│   └── execution-engine.ts     # ExecutionEngine class
└── __tests__/
    ├── perception-engine.test.ts
    ├── reasoning-engine.test.ts
    ├── strategy-selector.test.ts
    ├── planning-engine.test.ts
    ├── execution-engine.test.ts
    └── orchestrator.test.ts
```

## Step-by-step Plan

### Step 1: `src/config.ts` — AgentCoreConfig

Define a zod schema for engine-specific configuration that wraps `AgentConfig` from shared. Knobs include:
- `maxReasoningSteps` (default 6)
- `maxPlanSteps` (default 10)
- `maxExecutionRetries` (default 2)
- `parallelExecution` (boolean, default true)
- `planApprovalRequired` (boolean, default false)
- `circuitBreakerThreshold` (default 3 consecutive failures)
- `stepTimeoutMs` (default 30000)
- `confidenceThreshold` (default 0.7)

Verify: `tsc --noEmit` passes.

### Step 2: `src/perception/perception-engine.ts` — PerceptionEngine

Class that takes `IMemoryManager` via constructor.

Public method: `perceive(message: AgentMessage, availableTools: string[]): Promise<PerceptionResult>`

Implementation:
- Extract intent from message content using keyword heuristics (no LLM call — deterministic classification for now; LLM can be plugged in later)
- Classify complexity based on content length and entity count
- Extract entities via simple pattern matching (URLs, numbers, code blocks, etc.)
- Query `IMemoryManager.recall()` for context enrichment
- Detect caller style signals from message metadata
- Return a validated `PerceptionResult`

Keep it simple: no LLM calls. The perception engine is a structured analyzer. LLM-based perception is a future enhancement.

Verify: unit tests pass, `tsc --noEmit` passes.

### Step 3: `src/reasoning/strategy-selector.ts` — StrategySelector

Pure function / small class implementing the strategy selection logic from design doc Sec 6.2:
- `requiresTools` -> `react`
- `complexity === "complex"` -> `reflexion`
- `intent === "analysis_request" && complexity === "medium"` -> `internal_debate`
- `intent === "creative_request"` -> `internal_debate`
- Default -> `chain_of_thought`

Verify: unit tests for each branch.

### Step 4: `src/reasoning/reasoning-engine.ts` — ReasoningEngine

Class that takes `IMCPManager` and `IMemoryManager` via constructor.

Public method: `reason(perception: PerceptionResult, behavior: BehaviorParameters): Promise<ReasoningResult>`

Implementation:
- Use `StrategySelector` to pick a strategy
- Execute the chosen strategy:
  - **chain_of_thought**: Build reasoning steps sequentially. Each step: formulate thought, assign confidence. No tool calls.
  - **react**: Reason-Act-Observe loop. Actions are `IMCPManager.callTool()` calls. Observation is the tool result. Loop up to `maxReasoningSteps`.
  - **reflexion**: Run chain_of_thought, then self-reflect: check for contradictions, assess confidence, optionally re-reason.
  - **internal_debate**: Generate 3 perspective arguments (pragmatic, thorough, creative), synthesize a conclusion.
  - **tree_of_thought / analogical**: Return `not_implemented` error (PLANNED status per design doc).
- Collect trace strings throughout
- Return validated `ReasoningResult`

For this first implementation, strategies are deterministic template-based (no LLM). Each strategy produces structured steps from the perception data. LLM integration is a future enhancement that plugs into the same interface.

Verify: unit tests for each strategy path, `tsc --noEmit`.

### Step 5: `src/planning/planning-engine.ts` — PlanningEngine

Class that takes `IMCPManager` and `IMemoryManager` via constructor.

Public method: `createPlan(reasoning: ReasoningResult, availableTools: MCPTool[]): Promise<ExecutionPlan>`

Implementation:
- Query `IMemoryManager.getBestProcedure()` for known procedures matching the goal
- If a procedure exists with high success rate, convert its steps to `PlanStep` objects
- Otherwise, generate steps from reasoning conclusion:
  - If reasoning used `react`, each reasoning step with an action becomes a plan step
  - If reasoning used other strategies, generate a single `response` step
- Compute `parallelGroups` from dependency graph (topological sort; steps with no unmet deps run in parallel)
- Estimate cost (count tool_call steps * estimated cost per call)
- Validate with `ExecutionPlanSchema`
- Support re-planning: `replan(plan, failedStepId, error): Promise<ExecutionPlan>` — remove failed step, insert fallback, recompute parallel groups

Verify: unit tests including dependency graph / parallel group detection.

### Step 6: `src/execution/execution-engine.ts` — ExecutionEngine

Class that takes `IMCPManager` and `IMemoryManager` via constructor.

Public method: `execute(plan: ExecutionPlan): Promise<ExecutionResult>`

Implementation:
- Process parallel groups in order
- For each group, execute steps concurrently via `Promise.allSettled`
- Step lifecycle per step:
  1. **validate**: check deps are met, tool exists (for tool_call)
  2. **execute**: call `IMCPManager.callTool()` for tool_call, or resolve directly for reasoning/memory_lookup/response
  3. **verify**: check result success
  4. **report**: record `StepResult` with timing
- Error handling per step:
  - If step has `fallbackAction`, attempt it
  - If retries remain (`maxExecutionRetries` from config), retry
  - Otherwise mark step as failed
- Circuit breaker: track consecutive failures; if threshold hit, abort remaining steps
- On success, call `IMemoryManager.learn()` with a procedure derived from the plan
- Return validated `ExecutionResult`

Verify: unit tests for success path, retry, fallback, circuit breaker.

### Step 7: `src/orchestrator.ts` — StemAgent

Implements `IStemAgent` from shared.

Constructor takes: `config: AgentCoreConfig`, `mcpManager: IMCPManager`, `memoryManager: IMemoryManager`.

Methods:
- `initialize()`: call `mcpManager.connectAll()`, `mcpManager.discoverCapabilities()`, store available tools
- `shutdown()`: call `mcpManager.shutdown()`, `memoryManager.shutdown()`
- `process(taskId, message, principal?)`: the main pipeline:
  1. Perception: `perceptionEngine.perceive(message, toolNames)`
  2. Reasoning: `reasoningEngine.reason(perception, behaviorParams)`
  3. Planning: `planningEngine.createPlan(reasoning, tools)`
  4. Execution: `executionEngine.execute(plan)`
  5. Format response as `AgentResponse`
  6. Store episode in memory (non-blocking)
  7. Return response
- `stream(taskId, message)`: async generator that yields partial responses after each phase
- `getAgentCard()`: return an `AgentCard` built from config

Error boundary: catch errors in process, return failed `AgentResponse`, store failure in memory.

Verify: integration test with mocked MCP and Memory.

### Step 8: `src/index.ts` — Public API

Export: `StemAgent`, `AgentCoreConfig`, `AgentCoreConfigSchema`, `PerceptionEngine`, `ReasoningEngine`, `StrategySelector`, `PlanningEngine`, `ExecutionEngine`.

### Step 9: Tests

Write tests for each module with mocked `IMCPManager` and `IMemoryManager`. Target >80% coverage.

Test files:
- `perception-engine.test.ts`: intent classification, entity extraction, complexity scoring, memory enrichment
- `strategy-selector.test.ts`: each branch of strategy selection
- `reasoning-engine.test.ts`: each strategy (CoT, ReAct, Reflexion, Debate), planned strategy errors
- `planning-engine.test.ts`: plan from reasoning, parallel group detection, re-planning, procedure reuse
- `execution-engine.test.ts`: success path, parallel execution, retry, fallback, circuit breaker, memory learn call
- `orchestrator.test.ts`: full pipeline, initialization, shutdown, error handling, stream

### Step 10: Build verification

Run `tsc --noEmit` and `vitest run` to confirm everything compiles and tests pass.

## Key Design Decisions

1. **No LLM calls in v0**: All engines use deterministic logic. This makes the package testable and fast without requiring API keys. LLM integration points are clearly marked for future enhancement.
2. **Constructor injection**: All engines receive `IMCPManager`/`IMemoryManager` via constructor, never import implementations.
3. **Zod validation**: All inputs/outputs validated against shared schemas.
4. **Circuit breaker in execution**: Prevents cascading failures when MCP tools are down.
5. **Parallel group execution**: Steps without dependency conflicts run concurrently.
6. **PLANNED strategies**: tree_of_thought and analogical throw descriptive errors rather than silently degrading.
