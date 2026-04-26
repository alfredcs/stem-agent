# Changelog

All notable changes to the `stem-agent` monorepo are recorded here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/). All eight
workspaces (`stem-agent` root, `@stem-agent/shared`, `@stem-agent/agent-core`,
`@stem-agent/caller-layer`, `@stem-agent/mcp-integration`,
`@stem-agent/mcp-server`, `@stem-agent/memory-system`,
`@stem-agent/standard-interface`) are versioned in lockstep.

---

## [0.1.1] — 2026-04-26

Patch release closing the P0 and P1 gaps from design review
`DR-2026-04-25-001` (*Agent Differentiation*). `DomainPersona` — previously
defined as "the differentiation primitive" but never wired into the
cognitive pipeline — now drives system prompts, reasoning strategy, tool
scope, refusal boundaries, and behavior overrides end-to-end. The cellular
skill-lifecycle half remains unchanged.

### Added

- **`DomainPersona` plumbing through agent-core.**
  - `StemAgent` constructor accepts an optional `persona?: DomainPersona`
    parameter (`packages/agent-core/src/orchestrator.ts`).
  - `getPersona()` accessor on `StemAgent`.
  - Persona `systemPrompt` is threaded into `PerceptionEngine`,
    `ReasoningEngine`, and `PlanningEngine` and prepended to every LLM
    system message.
  - Persona `preferredStrategy` is threaded into
    `ReasoningEngine.reason(perception, behavior, strategyOverride?)` and
    bypasses `StrategySelector` when set.
- **Persona guardrails (`orchestrator.ts`).**
  - `checkPersonaGuardrails()` — refuses requests whose perceived intent
    is not in `persona.allowedIntents`, or whose content contains a
    `persona.forbiddenTopics` substring. Both paths short-circuit before
    reasoning and return a structured refusal with
    `metadata.refusal = "intent_not_allowed" | "forbidden_topic"`.
  - `filterToolsByPersona()` — scopes MCP tools passed to the planner by
    `persona.toolAllowlist`; empty allowlist means all tools are permitted.
- **Caller-profile confidence gating (`orchestrator.ts:35-39`).**
  - `MIN_INTERACTIONS_FOR_TRUST = 5` and `CONFIDENCE_FOR_PROFILE = 0.5`
    module constants.
  - `adapt()` falls back to `perception.callerStyleSignals` when a profile
    is below either threshold and overlays `persona.defaultBehavior` on
    top of the resulting base, establishing a deterministic precedence
    order: defaults → caller-profile signals → persona overrides.
- **Meaningful skill crystallization.**
  - `storeEpisode()` now records `intent:<intent>` and `tool:<name>`
    actions (plus `domain`, `complexity`, `persona` context) so
    `SkillManager.detectPatterns` can actually group episodes by
    meaningful signatures. Previously every episode hashed to a single
    `["process"]` bucket, producing one useless auto-skill.
- **Entrypoint persona loading.**
  - New `src/persona-loader.ts` — shared helper that validates a
    `DomainPersona` JSON file via `DomainPersonaSchema` and dynamically
    imports compiled `dist/domains/<tag>/skills.js` for each
    `domainTag`, registering plugin skills into the agent's
    `SkillManager`. Missing domain files are logged and skipped so
    misconfiguration cannot crash the agent.
  - `src/server.ts` (HTTP gateway) now reads `DOMAIN_PERSONA`, parses it
    via `loadPersona`, passes it to `StemAgent`, and calls
    `registerPersonaDomainSkills`.
  - `src/mcp-entrypoint.ts` (stdio) does the same; previously the persona
    was read but only passed to the MCP wrapper, never into the
    underlying `StemAgent`.
- **Domain skills compile target.**
  - New `tsconfig.domains.json` compiles `domains/**/*.ts` into
    `dist/domains/` so `persona-loader` can import them at runtime.
  - Root `tsconfig.json` now references this project.
- **Public type export.**
  - `SkillPluginInput = Omit<z.input<typeof SkillSchema>, "id" | "createdAt" | "updatedAt">`
    exposed from `@stem-agent/agent-core` so downstream domain packages
    can rely on Zod-default semantics when authoring plugin skills.
- **Integration tests (`packages/agent-core/src/__tests__/orchestrator.test.ts`).**
  Nine new tests covering the differentiation pipeline end-to-end:
  1. Committed skill short-circuits reasoning + planning.
  2. Progenitor skills do *not* short-circuit.
  3. `persona.preferredStrategy` overrides `StrategySelector`.
  4. `persona.toolAllowlist` filters the tool set passed to the planner.
  5. `persona.forbiddenTopics` triggers refusal before `ReasoningEngine.reason()` is called.
  6. `persona.allowedIntents` rejects out-of-scope intents.
  7. `persona.defaultBehavior` overrides caller-profile adaptation.
  8. Low-confidence caller falls back to `perception.callerStyleSignals`.
  9. High-confidence caller uses the learned profile.

### Changed

- **`SkillManager.registerPlugin` signature.** Changed from
  `Omit<Skill, "id" | "createdAt" | "updatedAt">` to `SkillPluginInput`
  so defaulted Zod fields (`source`, `steps`, `trigger.entityTypes`,
  `tags`) remain optional at authoring time. No behavior change; domain
  skill files now type-check cleanly under `tsconfig.domains.json`.
- **Test assertion retargeting.**
  `packages/mcp-server/src/__tests__/mcp-entrypoint.test.ts` — the
  "imports `DomainPersonaSchema`" assertion now looks at
  `src/persona-loader.ts` (where the schema usage lives) rather than
  `src/mcp-entrypoint.ts`, reflecting the new shared-loader layer.
- **Version bump.** All eight `package.json` files bumped from
  `0.1.0` → `0.1.1`.

### Fixed

- Persona fields `systemPrompt`, `preferredStrategy`, `forbiddenTopics`,
  `toolAllowlist`, `allowedIntents`, `defaultBehavior`, and `domainTags`
  now have live consumers inside the agent core. In `0.1.0` all seven had
  zero live reads across `packages/agent-core/` and
  `packages/standard-interface/`.
- Flagship demo `examples/02_cell_differentiation.py` now runs against a
  differentiated server when the server is started with
  `DOMAIN_PERSONA=...`. (Rewriting the demo to drive multiple server
  instances simultaneously is tracked as P2 in the review.)

### Documentation

- `docs/design-reviews/2026-04-25-agent-differentiation-review.md` bumped
  to v2.0.0 (*Resolved*). Adds side-by-side v1.0.0 / v2.0.0 status
  tables, an updated traceability matrix, checked-off acceptance
  criteria, and a new §11 resolution summary listing every code change
  and every new test.

### Known limitations / still P2

- `examples/02_cell_differentiation.py` still constructs persona dicts
  client-side; the HTTP path ignores them. Running one server per
  persona via `DOMAIN_PERSONA=...` works and is honored end-to-end, but
  the demo script has not been rewritten to spawn multiple servers or
  hit a hot-swap endpoint.
- `packages/mcp-server/src/__tests__/skill-and-rules.test.ts` fails at
  file load time on missing `.claude/rules/finance-domain.md` and
  `.claude/rules/sre-domain.md`. Orthogonal to differentiation; these
  are Claude Code rule documents that have never existed in the repo.
- `npm run lint` is non-functional — ESLint 9 requires an
  `eslint.config.js` that the repo does not yet provide. Pre-existing;
  not a `0.1.1` regression.

### Test coverage after 0.1.1

| Workspace                  | Files | Tests |
|----------------------------|------:|------:|
| `@stem-agent/mcp-integration`  | 8 |  65 |
| `@stem-agent/memory-system`    | 11 | 153 |
| `@stem-agent/agent-core`       | 7 |  85 (17 in `orchestrator.test.ts`, up from 14) |
| `@stem-agent/standard-interface` | 11 | 102 |
| `@stem-agent/caller-layer`     | 4 |  43 |
| `@stem-agent/mcp-server`       | 3 of 4 passing | 76 (1 pre-existing file failure, unrelated) |
| **Total**                  | **44 of 45** | **524** |

### References

- Design review: [docs/design-reviews/2026-04-25-agent-differentiation-review.md](design-reviews/2026-04-25-agent-differentiation-review.md) (DR-2026-04-25-001, v2.0.0)
- Canonical differentiation constants: `packages/agent-core/src/orchestrator.ts:35-39`, `packages/agent-core/src/skills/skill-manager.ts:23-31`

---

## [0.1.0] — 2026-03-26 (baseline)

Initial public cut of the stem-agent monorepo. Includes:

- Five-layer architecture (Caller → Standard Interface → Agent Core → Memory → MCP).
- Eight-phase cognitive pipeline (Perceive, Adapt, Skill Match, Reason, Plan, Execute, Learn, Respond).
- Skill lifecycle with `progenitor` → `committed` → `mature` transitions and apoptosis on persistent failure.
- Caller Profiler with EMA-based learning over 20+ dimensions.
- Four-type memory system (episodic, semantic, procedural, user context) with ATLAS self-learning.
- Multi-protocol gateway: A2A, AG-UI, A2UI, UCP, AP2.
- Four framework adapters: AutoGen, CrewAI, LangGraph, OpenAI Agents SDK.
- `DomainPersona` type and `domains/{finance,sre}/` persona + skill definitions (defined but not wired — see 0.1.1).

[0.1.1]: #011--2026-04-26
[0.1.0]: #010--2026-03-26-baseline
