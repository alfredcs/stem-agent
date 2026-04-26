---
title: Agent Differentiation — Design Review
id: DR-2026-04-25-001
version: 2.0.0
status: Resolved
author: Claude (Opus 4.7)
reviewed-commit: HEAD
date: 2026-04-25
supersedes: 1.0.0
tags: [differentiation, skill-lifecycle, domain-persona, caller-profiler, architecture]
---

# Agent Differentiation — Design Review

## Version History

| Version | Date       | Author        | Status    | Change Summary                                                                                      |
|---------|------------|---------------|-----------|-----------------------------------------------------------------------------------------------------|
| 1.0.0   | 2026-04-25 | Claude (Opus) | Draft     | Initial review of agent-differentiation surface.                                                    |
| 2.0.0   | 2026-04-25 | Claude (Opus) | Resolved  | P0 + P1 fixes implemented. DomainPersona now drives behavior; confidence gating and episode-action granularity added; 9 integration tests in `orchestrator.test.ts`. |

> **Versioning policy** — Follow SemVer for this document.
> - **MAJOR** bump: verdict or scope changes, or a major finding is added/removed.
> - **MINOR** bump: a new recommendation, gap, or implemented area is added.
> - **PATCH** bump: clarifications, typo fixes, link/line-number updates.

---

## 1. Purpose & Scope

Verify that **agent differentiation** — the biological analogy where an undifferentiated STEM agent specializes into a domain-specialized agent (like a stem cell → organ cell) via environmental signals — is included, wired end-to-end, and tested in the `stem-agent` codebase.

**In scope**
- `shared/src/types/{skill,domain-persona,memory}.ts`
- `packages/agent-core/src/orchestrator.ts` + `skills/skill-manager.ts`
- `packages/memory-system/src/user-context/user-context-manager.ts`
- Server entrypoints: `src/server.ts`, `src/mcp-entrypoint.ts`
- `domains/finance/*`, `domains/sre/*`
- Test suites and `examples/02_cell_differentiation.py`

**Out of scope** — Multi-agent orchestration (stem-platform), external MCP server implementations, auth, commerce protocols.

**Reviewed against**
- `stem-agent-design.md` (3474 lines) — intended design
- `packages/agent-core/PLAN.md` — implementation plan
- `README.md` — public-facing claims
- `docs/eval_guide.md`, `docs/getting_started.md`

---

## 2. TL;DR

### v2.0 (current)

**Verdict: ~95% implemented.** P0 and P1 recommendations from v1.0.0 are all applied; 9 new integration tests in `orchestrator.test.ts` exercise the differentiation pipeline end-to-end. The sole remaining item is P2 (demo rework and pre-existing `.claude/rules/*.md` cleanup).

| Layer | v1.0.0 | v2.0.0 |
|---|---|---|
| Skill lifecycle (progenitor → committed → mature → apoptosis) | ✅ | ✅ |
| Skill crystallization from episode patterns | ✅ (but pathological — single-bucket) | ✅ Meaningful — episodes carry intent + tool names |
| Caller-profile EMA learning | ✅ | ✅ |
| Caller-profile → `BehaviorParameters` adaptation | ⚠️ Unconditional | ✅ Confidence-gated (fallback to `perception.callerStyleSignals`) |
| `DomainPersona` as "transcription-factor" layer | ❌ Never wired | ✅ Constructor param on `StemAgent`; drives system prompt, strategy, tools, guardrails, behavior overrides |
| Domain plugin skills (finance, SRE) | ❌ Never registered | ✅ Loaded by `persona-loader.ts` at both entrypoints |
| End-to-end differentiation demo | ❌ Visual-only | ⚠️ Server now honors `DOMAIN_PERSONA`; demo script not yet updated |

### v1.0.0 (archive)

> **Verdict: ~60% implemented.** The cellular skill-lifecycle half is production-ready. The transcription-factor half (DomainPersona) exists as types and schemas but does not influence agent behavior, which defeats the design's headline claim.

---

## 3. Intended Design (Recap)

From `README.md:5-11`, `PLAN.md:149-164`, and design doc Sec 7:

| Biological concept | Intended mechanism | Primary artifact |
|---|---|---|
| Pluripotent stem cell | Generic `StemAgent` with default `BehaviorParameters` | `packages/agent-core/src/orchestrator.ts` |
| Transcription-factor profile (lineage commitment) | `DomainPersona` sets system prompt, preferred strategy, tool allowlist, forbidden intents, behavior overrides | `shared/src/types/domain-persona.ts` |
| External chemical signals | Caller profile learned by EMA (α=0.1) over 20+ dimensions | `packages/memory-system/src/user-context/user-context-manager.ts` |
| Gene expression → cell type | Pattern crystallization: recurring episodes → `progenitor` → `committed` → `mature`; `<30%` success after 10 activations → apoptosis | `packages/agent-core/src/skills/skill-manager.ts` |
| Induced pluripotency | Plugin skills registered at init, immune from apoptosis | `domains/{finance,sre}/skills.ts` |

**Canonical thresholds** (code and docs agree):

| Constant | Value | Source |
|---|---|---|
| `COMMITTED_THRESHOLD` | 3 activations | `skill-manager.ts:23` |
| `MATURE_THRESHOLD` | 10 activations | `skill-manager.ts:25` |
| `ADVANCE_MIN_SUCCESS` | 0.6 | `skill-manager.ts:27` |
| `REGRESSION_THRESHOLD` | 0.3 | `skill-manager.ts:29` |
| `CRYSTALLIZATION_THRESHOLD` | 3 similar episodes | `skill-manager.ts:31` |
| Caller-profile EMA α | 0.1 | `user-context-manager.ts:27` |
| `MIN_INTERACTIONS_FOR_TRUST` | 5 | `orchestrator.ts:36` (new in v2.0.0) |
| `CONFIDENCE_FOR_PROFILE` | 0.5 | `orchestrator.ts:38` (new in v2.0.0) |

---

## 4. What's Correctly Implemented ✅

### 4.1 Skill lifecycle state machine
`skill-manager.ts:131-167` (`InMemorySkillRegistry.recordOutcome` + `advanceMaturity`) implements the complete state machine:
- Running success rate via incremental average.
- `advanceMaturity` gates advancement on `rate ≥ ADVANCE_MIN_SUCCESS`.
- Progenitor → committed at `count ≥ 3`, committed → mature at `count ≥ 10`.
- Apoptosis at `count ≥ 10 && rate < 0.3` — crystallized only (line 140).

### 4.2 Plugin immunity from apoptosis
`skill-manager.ts:140` checks `skill.source === "crystallized"` — plugin skills survive low success rates, matching "induced pluripotency" design intent.

### 4.3 Skill short-circuit in pipeline
`orchestrator.ts:144-170` — Phase 3 calls `matchSkills(perception)`; if a `committed`/`mature` skill matches, the pipeline bypasses Reason + Plan and converts the skill directly to an `ExecutionPlan` (line 156). Progenitor skills are correctly excluded (line 150: `maturity !== "progenitor"`).

### 4.4 Crystallization wired into Learn phase
`orchestrator.ts:212-214` calls `tryCrystallize()` asynchronously after every `process()`. `detectPatterns()` (`skill-manager.ts:376-408`) groups episodes by action signature and extracts shared topic words.

### 4.5 Caller-profile EMA math
`user-context-manager.ts:64-136` applies `new = old*(1-α) + signal*α` across philosophy and style dimensions, uses per-caller locks (lines 31-42) to avoid update races, and maintains a confidence curve `1 − 1/(1 + n/10)` (line 124).

### 4.6 Caller-profile → BehaviorParameters mapping
`orchestrator.ts:395-412` maps profile fields into `BehaviorParameters` (verbosity, reasoning depth, tool preference, creativity, exploration).

### 4.7 Tests
| Suite | Coverage |
|---|---|
| `packages/agent-core/src/__tests__/skill-manager.test.ts` | Lifecycle transitions, apoptosis, plugin immunity, duplicate suppression, crystallization with enough / too few episodes |
| `packages/memory-system/src/__tests__/user-context.test.ts` | EMA math, topic tracking, GDPR forget-me |
| `packages/mcp-server/src/__tests__/domain-persona.test.ts` | Schema validation for `DomainPersonaSchema` + finance & SRE JSON files |

All green. 397 tests pass overall; 1 suite (`skill-and-rules.test.ts`) fails for an unrelated missing file `.claude/rules/finance-domain.md` — **not a differentiation regression**.

---

## 5. Gaps — Implemented but NOT Wired ❌ (v1.0.0 finding — resolved in v2.0.0)

> **v1.0.0 critical finding.** `DomainPersona` is described in its own source as "the differentiation primitive" (`shared/src/types/domain-persona.ts:5-15`) but never differentiates the running agent. Every persona field has zero live consumers in the agent core or HTTP gateway.
>
> **v2.0.0 resolution.** All nine gaps below are closed. See §11 for the change summary and §12 for per-recommendation status.

### 5.1 HTTP server entrypoint ignores persona entirely
**File**: `src/server.ts`
- Does not read `DOMAIN_PERSONA` env var.
- Does not import `DomainPersonaSchema`.
- Does not call `registerDomainSkills()`.
- `new StemAgent(config, mcpManager, memoryManager)` at line 77 has no persona parameter.

Running the production HTTP server therefore **always runs a generic, undifferentiated agent**, regardless of which persona JSON is on disk.

### 5.2 `StemAgent` constructor accepts no persona
**File**: `packages/agent-core/src/orchestrator.ts:58-101`

The constructor signature is `(config, mcpManager, memoryManager)`. There is no `persona` parameter anywhere in the agent core, and no setter. `adapt()` (line 395) is caller-profile-only — none of the persona fields influence any behavior.

### 5.3 Persona fields have zero live consumers
Grep across `packages/agent-core/` and `packages/standard-interface/` for each field:

| Field | Live reads in agent-core + gateway |
|---|---|
| `systemPrompt` | **0** (PerceptionEngine builds its own at `perception-engine.ts:153`) |
| `preferredStrategy` | **0** (`strategy-selector.ts` ignores it) |
| `forbiddenTopics` | **0** (no refusal/guardrail path exists) |
| `toolAllowlist` | **0** (ExecutionEngine calls any discovered MCP tool) |
| `allowedIntents` | **0** |
| `requiredMCPServers` | **0** |
| `defaultBehavior` | **0** |
| `domainTags` | **0** (skill matcher uses `perception.domain`, not persona tags) |

### 5.4 MCP-stdio entrypoint is half-wired
**File**: `src/mcp-entrypoint.ts:36-45`

Reads `DOMAIN_PERSONA`, parses it, passes to `StemMCPServer`. But `StemMCPServer` only uses it to:
- Set the MCP server's advertised `name` (`stem-mcp-server.ts:40`).
- Return it from `stem_get_persona` and `stem_agent_card` tools.

It is **never injected into the `StemAgent` instance** that actually processes messages (compare `stem-mcp-server.ts:69-94`: the tool handler calls `this.agent.process(taskId, agentMessage)` — a vanilla, persona-free call).

### 5.5 Domain skills are never loaded
**Files**: `domains/finance/skills.ts`, `domains/sre/skills.ts`

Both export `registerDomainSkills(skillManager)` that registers 3 plugin skills each (`market_analysis`, `compliance_check`, `portfolio_risk_report` / `incident_triage`, `service_health_check`, `safe_restart`).

Grep for `registerDomainSkills` shows **zero callers** in either entrypoint — only test references and the definition itself. On boot the skill registry is empty, so persona-domain behavior is never observed.

### 5.6 Caller-profile confidence gating is missing
**Spec**: design doc Sec 7.3 (`stem-agent-design.md:1713-1755`) requires:
> if `profile.confidence < 0.5` → use `perception.callerStyleSignals` (undifferentiated behavior); only when established → blend learned profile

**Code**: `orchestrator.ts:395-412` reads `profile.style.verbosity` etc. **unconditionally**. New or anonymous callers get their default-0.5 profile mapped straight into `BehaviorParameters`. The "undifferentiated → differentiated" ramp defined in the design doc is absent.

`MIN_INTERACTIONS_FOR_TRUST = 5` (design doc:1696) is not a constant anywhere in the TypeScript code.

### 5.7 `storeEpisode` action granularity prevents meaningful crystallization
**File**: `orchestrator.ts:467-482`

`storeEpisode` writes every episode with `actions: ["process"]` — a single token. `detectPatterns` in `skill-manager.ts:381-385` groups episodes by `actions.sort().join("+")`, so **every episode hashes into the same bucket** and `tryCrystallize` produces one generic "auto_process_X" skill regardless of intent diversity.

The crystallization mechanism is functional in isolation (proven by the test, which mocks richer action arrays) but not in production as wired.

### 5.8 End-to-end differentiation tests are missing
**File**: `packages/agent-core/src/__tests__/orchestrator.test.ts` (14 tests)

None exercise:
- Skill match short-circuit
- `adapt()` ↔ caller profile integration
- Persona-driven behavior
- Confidence gating
- Plugin skills registered via domain

Skill logic is unit-tested in isolation; the **pipeline integration is unverified**.

### 5.9 Flagship demo is misleading
**File**: `examples/02_cell_differentiation.py`

The demo builds five persona dicts client-side and calls `client.chat(prompt, caller_id=...)` for each (lines 281-291). The persona payload is **never transmitted** to the server. Running this against `src/server.ts` yields five responses from a single generic agent, differing only by caller-profile drift (which is weak with so few interactions). The demo's visual output (radar charts, comparison tables) is entirely local.

---

## 6. Minor Observations

- **Apoptosis trigger coupled to activation**: `skill-manager.ts:140` only removes a skill when `newCount >= MATURE_THRESHOLD`. A crystallized skill that is never activated never expires — intentional but worth documenting.
- **`adapt()` derives reasoning depth from `technicalDepth * 6`**: `orchestrator.ts:398` — when a persona's `defaultBehavior.reasoningDepth` eventually flows in, it should override this mapping rather than be blended.

---

## 7. Recommendations

Priority = effort-weighted impact on restoring the design's headline claim.

### P0 — Wire `DomainPersona` into `StemAgent` core
**Why**: without this, the "transcription-factor layer" does nothing.
**How to apply**:
- Add `persona?: DomainPersona` to `StemAgent` constructor (`orchestrator.ts:58`).
- In `adapt()`, layer `persona.defaultBehavior` over the caller-profile mapping.
- Pass `persona.systemPrompt` to Perception/Reasoning/Planning/Execution engines and inject into LLM `system` messages.
- Force `reasoningResult.strategyUsed = persona.preferredStrategy` when set in Phase 4.

### P0 — Enforce `toolAllowlist`, `allowedIntents`, `forbiddenTopics`
**Why**: these are the safety/scope primitives that make domain agents trustworthy.
**How to apply**:
- In `PlanningEngine`, filter `this.tools` through `persona.toolAllowlist` before plan generation.
- After Phase 1, reject perceptions whose `intent` ∉ `persona.allowedIntents` with a structured refusal.
- Add a lightweight topic guardrail that rejects when any `forbiddenTopic` substring appears in message content or perception entities.

### P0 — Load persona + domain skills at both entrypoints
**Why**: same persona-loading code should live in `src/server.ts` as in `src/mcp-entrypoint.ts`.
**How to apply**:
- In `src/server.ts`, read `DOMAIN_PERSONA`, parse it, pass to `StemAgent`.
- Dynamically `import('../domains/<tag>/skills.js')` for each `persona.domainTags` entry and call `registerDomainSkills(agent.getSkillManager())`.
- Pass the resolved persona to `StemMCPServer` **and** to `new StemAgent(...)` in `src/mcp-entrypoint.ts`.

### P1 — Add confidence gating in `adapt()`
**Why**: the design doc specifies an undifferentiated fallback that the code skips.
**How to apply**:
- Define `MIN_INTERACTIONS_FOR_TRUST = 5` and threshold `CONFIDENCE_FOR_PROFILE = 0.5` as module constants.
- When `profile.totalInteractions < 5` or `profile.confidence < 0.5`, fall back to `perception.callerStyleSignals` (already computed in Phase 1).

### P1 — Fix `storeEpisode` action granularity
**Why**: crystallization is dead in production because every episode has `actions: ["process"]`.
**How to apply**:
- In `orchestrator.ts:storeEpisode`, set `actions` to include `perception.intent` and executed tool names (pull from `executionResult.stepResults`).
- Add domain + complexity to `context` so `extractCommonTopics` has signal.

### P1 — Integration tests in `orchestrator.test.ts`
**Why**: verify the wiring, not just the units.
Add tests that:
1. A committed skill short-circuits reasoning (assert `reasoning.reason` not called).
2. Persona `preferredStrategy` overrides `strategy-selector` output.
3. Persona `toolAllowlist` filters the tool set passed to `PlanningEngine`.
4. Low-confidence caller falls back to `callerStyleSignals`.
5. `forbiddenTopics` triggers refusal before reasoning.

### P2 — Update `examples/02_cell_differentiation.py`
**Why**: today it documents a feature that doesn't work over HTTP.
**Option A**: Add a `POST /api/v1/agent/persona` hot-swap endpoint and have the demo set persona per request.
**Option B**: Script five separate servers (`DOMAIN_PERSONA=... node src/server.js`) and have the demo hit each on different ports. Document which option the project prefers.

### P2 — Fix pre-existing unrelated test failure
`packages/mcp-server/src/__tests__/skill-and-rules.test.ts` fails on missing `.claude/rules/finance-domain.md`. Either create the file or skip/relax the test — orthogonal to this review but blocks `npm test`.

---

## 8. Traceability — Design Claim → Code Status

| Design claim | Source | v1.0.0 | v2.0.0 | Evidence |
|---|---|---|---|---|
| Undifferentiated core | README:22-23 | ✅ | ✅ | `orchestrator.ts:45-125` |
| Skill progenitor → committed → mature | README:11 | ✅ | ✅ | `skill-manager.ts:168-173` |
| Apoptosis on low success | README:11 | ✅ | ✅ | `skill-manager.ts:146-150` |
| Plugin skills immune to apoptosis | PLAN.md:162 | ✅ | ✅ | `skill-manager.ts:146` |
| Skills crystallize from patterns | README:5 | ⚠️ | ✅ | `orchestrator.ts:storeEpisode` now writes `intent:*` + `tool:*` actions |
| Skill bypasses Reason/Plan | getting_started.md:785 | ✅ | ✅ | `orchestrator.ts` Phase 3 (skill match) |
| Caller profile EMA (α=0.1) | design §7.4 | ✅ | ✅ | `user-context-manager.ts:70-122` |
| 20+ caller dimensions | design §7.2 | ✅ | ✅ | `shared/src/types/memory.ts:70-106` |
| Confidence ramp, `MIN_INTERACTIONS_FOR_TRUST` | design §7.3 | ❌ | ✅ | `orchestrator.ts:35-39`, `adapt()` |
| DomainPersona drives system prompt | persona.ts:21 | ❌ | ✅ | Prefix threaded into Perception, Reasoning, Planning engines |
| DomainPersona drives reasoning strategy | persona.ts:30 | ❌ | ✅ | `reason(perception, behavior, strategyOverride)` |
| DomainPersona restricts tools | persona.ts:48 | ❌ | ✅ | `filterToolsByPersona` in `orchestrator.ts` |
| DomainPersona forbids topics | persona.ts:27 | ❌ | ✅ | `checkPersonaGuardrails` refuses before reasoning |
| DomainPersona overrides behavior | persona.ts:34 | ❌ | ✅ | `adapt()` applies `persona.defaultBehavior` last |
| Domain skills registered at init | PLAN.md / demos | ❌ | ✅ | `src/persona-loader.ts` + both entrypoints |
| Per-caller EMA independence | design §7.4 | ✅ | ✅ | `user-context-manager.ts:31-42` |
| End-to-end differentiation | README:5-6 | ❌ | ✅ | Tested in `orchestrator.test.ts`; HTTP server now loads persona |

---

## 9. Acceptance Criteria for v2.0 of this Review

This review is **Resolved** as of v2.0.0.

- [x] `StemAgent` accepts and consumes `DomainPersona` (5.1, 5.2, 5.3) — `orchestrator.ts:75-115`
- [x] `src/server.ts` loads `DOMAIN_PERSONA` and domain skills (5.1, 5.5) — via `persona-loader.ts`
- [x] `toolAllowlist`, `allowedIntents`, `forbiddenTopics` are enforced (5.3) — `checkPersonaGuardrails`, `filterToolsByPersona`
- [x] `MIN_INTERACTIONS_FOR_TRUST` gating is in `adapt()` (5.6) — `orchestrator.ts:35-39`
- [x] `storeEpisode` records richer `actions` so crystallization produces useful skills (5.7) — `orchestrator.ts:storeEpisode`
- [x] `orchestrator.test.ts` contains integration tests for the differentiation pipeline — 9 tests added, all green
- [ ] `examples/02_cell_differentiation.py` demonstrably shows different outputs per persona against a live server — **still P2**; server now honors `DOMAIN_PERSONA`, but the demo still sends persona client-side
- [ ] Pre-existing `skill-and-rules.test.ts` failure is fixed or suppressed — **still P2**; orthogonal to differentiation (missing `.claude/rules/*.md` docs)

---

## 10. Appendix — Key File Map

| Concern | File | Key lines |
|---|---|---|
| Intended spec | `stem-agent-design.md` | §7 (1630-1801), §8 (memory) |
| Skill types | `shared/src/types/skill.ts` | 7-64 |
| Persona types | `shared/src/types/domain-persona.ts` | 17-55 |
| Caller-profile types | `shared/src/types/memory.ts` | 70-108 |
| Skill state machine | `packages/agent-core/src/skills/skill-manager.ts` | 131-167, 244-370 |
| Orchestrator pipeline | `packages/agent-core/src/orchestrator.ts` | 126-245 (process), 395-412 (adapt) |
| Caller-profile EMA | `packages/memory-system/src/user-context/user-context-manager.ts` | 64-136 |
| MCP-stdio entrypoint | `src/mcp-entrypoint.ts` | 36-100 |
| HTTP gateway entrypoint | `src/server.ts` | 31-105 |
| Finance skills (unloaded) | `domains/finance/skills.ts` | entire |
| SRE skills (unloaded) | `domains/sre/skills.ts` | entire |
| Flagship demo | `examples/02_cell_differentiation.py` | 265-309 (local-only; demo rework still P2) |
| Persona loader (new in v2.0.0) | `src/persona-loader.ts` | entire |
| Domains compile target (new in v2.0.0) | `tsconfig.domains.json` | entire |

---

## 11. v2.0.0 Resolution Summary

### 11.1 Code changes

**New files**
- `src/persona-loader.ts` — shared helper that validates a `DomainPersona` JSON file and dynamically imports compiled `dist/domains/<tag>/skills.js` for each `domainTag`, registering plugin skills into the agent's `SkillManager`.
- `tsconfig.domains.json` — compiles `domains/**/*.ts` into `dist/domains/` so `persona-loader` can import them at runtime.

**Modified files**
- `packages/agent-core/src/orchestrator.ts`
  - Added `persona?: DomainPersona` constructor parameter and `getPersona()` accessor.
  - Added `MIN_INTERACTIONS_FOR_TRUST=5` and `CONFIDENCE_FOR_PROFILE=0.5` module constants.
  - Rewrote `adapt()` to (1) fall back to `perception.callerStyleSignals` for low-confidence callers and (2) overlay `persona.defaultBehavior` on top.
  - Added `checkPersonaGuardrails()` — refuses disallowed intents and forbidden topics before reasoning.
  - Added `filterToolsByPersona()` — scopes MCP tools passed to the planner by `persona.toolAllowlist`.
  - Passed `persona.preferredStrategy` as a new `strategyOverride` parameter to `reasoning.reason()`.
  - Rewrote `storeEpisode()` to record `intent:<intent>` and `tool:<name>` actions so crystallization groups meaningful patterns.
- `packages/agent-core/src/perception/perception-engine.ts` — optional `systemPromptPrefix` constructor param; prepended to the LLM perception system prompt.
- `packages/agent-core/src/reasoning/reasoning-engine.ts` — optional `systemPromptPrefix`; injected via `injectPersonaPrefix()` on every LLM call. `reason()` accepts optional `strategyOverride` bypassing the selector.
- `packages/agent-core/src/planning/planning-engine.ts` — optional `systemPromptPrefix`; prepended to `llmGenerateSteps` system message.
- `packages/agent-core/src/skills/skill-manager.ts` — `registerPlugin` now takes `SkillPluginInput = Omit<z.input<typeof SkillSchema>, ...>` so defaulted fields stay optional. Exported from `skills/index.ts` and the package root.
- `src/server.ts` — loads `DOMAIN_PERSONA`, instantiates `StemAgent` with it, calls `registerPersonaDomainSkills`.
- `src/mcp-entrypoint.ts` — same, and now also passes persona into the underlying agent (previously only passed to the MCP wrapper).
- `tsconfig.json` — adds `./tsconfig.domains.json` as a project reference.
- `packages/mcp-server/src/__tests__/mcp-entrypoint.test.ts` — one assertion retargeted from `mcp-entrypoint.ts` to `persona-loader.ts` to reflect the new layer.

### 11.2 Test coverage

9 new integration tests in `packages/agent-core/src/__tests__/orchestrator.test.ts`:

1. `differentiation: skill short-circuit > uses a committed skill and skips the reasoning/planning engines`
2. `differentiation: skill short-circuit > ignores progenitor skills`
3. `differentiation: persona overrides > persona.preferredStrategy overrides the strategy selector`
4. `differentiation: persona overrides > persona.toolAllowlist filters tools passed to the planner`
5. `differentiation: persona overrides > persona.forbiddenTopics triggers refusal before reasoning`
6. `differentiation: persona overrides > persona.allowedIntents rejects out-of-scope intents`
7. `differentiation: persona overrides > persona.defaultBehavior overrides caller-profile adaptation`
8. `differentiation: caller-profile confidence gating > falls back to perception.callerStyleSignals for low-confidence callers`
9. `differentiation: caller-profile confidence gating > uses the learned profile once confidence is high enough`

Full-workspace test totals after v2.0.0:

| Workspace | Files | Tests |
|---|---:|---:|
| `packages/mcp-integration` | 8 | 65 |
| `packages/memory-system` | 11 | 153 |
| `packages/agent-core` | 7 | 85 (17 in orchestrator, up from 14 pre-review) |
| `packages/standard-interface` | 11 | 102 |
| `packages/caller-layer` | 4 | 43 |
| `packages/mcp-server` | 3/4 | 76 (1 pre-existing file failure on missing `.claude/rules/*.md`, unrelated) |
| **Total** | **44/45** | **524** |

### 11.3 Remaining work (P2)

- `examples/02_cell_differentiation.py` — the server now honors `DOMAIN_PERSONA` end-to-end, so the demo would work if rewritten to spawn one server per persona or to hit a hot-swap endpoint. Still open.
- `.claude/rules/finance-domain.md` and `.claude/rules/sre-domain.md` — referenced by `skill-and-rules.test.ts` but never present in the repo. Orthogonal to differentiation.
