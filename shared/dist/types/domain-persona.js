import { z } from "zod";
import { ReasoningStrategy } from "./agent-core.js";
// ---------------------------------------------------------------------------
// Domain Persona — the differentiation primitive
//
// A DomainPersona bundles all configuration surfaces needed to specialize
// a generic stem-agent into a domain-specific agent. It threads through
// all engines: Perception (system prompt), Reasoning (strategy override),
// Planning (tool scoping), Execution (tool allowlist).
//
// Biological analogy: the transcription factor profile that determines
// which genes are expressed — turning a stem cell into a neuron, a
// muscle cell, or a blood cell.
// ---------------------------------------------------------------------------
export const DomainPersonaSchema = z.object({
    /** Display name for the differentiated agent (e.g., "FinanceAgent"). */
    name: z.string(),
    /** Domain-specific system prompt injected into all LLM calls. */
    systemPrompt: z.string(),
    /** Intent types this domain agent is allowed to handle. Empty = all. */
    allowedIntents: z.array(z.string()).default([]),
    /** Topics the agent must refuse to engage with (compliance boundaries). */
    forbiddenTopics: z.array(z.string()).default([]),
    /** Override the default reasoning strategy for this domain. */
    preferredStrategy: ReasoningStrategy.optional(),
    /** Behavior parameter overrides for this domain. */
    defaultBehavior: z.object({
        reasoningDepth: z.number().int().optional(),
        explorationVsExploitation: z.number().optional(),
        verbosityLevel: z.number().optional(),
        confidenceThreshold: z.number().optional(),
        toolUsePreference: z.number().optional(),
        creativityLevel: z.number().optional(),
        proactiveSuggestion: z.boolean().optional(),
        maxPlanSteps: z.number().int().optional(),
    }).default({}),
    /** MCP servers this domain agent requires to function. */
    requiredMCPServers: z.array(z.string()).default([]),
    /** Restrict which MCP tools the agent can call. Empty = all available. */
    toolAllowlist: z.array(z.string()).default([]),
    /** Domain tags for skill matching and memory retrieval. */
    domainTags: z.array(z.string()).default([]),
});
//# sourceMappingURL=domain-persona.js.map