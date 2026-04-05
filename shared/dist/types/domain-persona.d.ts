import { z } from "zod";
export declare const DomainPersonaSchema: z.ZodObject<{
    /** Display name for the differentiated agent (e.g., "FinanceAgent"). */
    name: z.ZodString;
    /** Domain-specific system prompt injected into all LLM calls. */
    systemPrompt: z.ZodString;
    /** Intent types this domain agent is allowed to handle. Empty = all. */
    allowedIntents: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Topics the agent must refuse to engage with (compliance boundaries). */
    forbiddenTopics: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Override the default reasoning strategy for this domain. */
    preferredStrategy: z.ZodOptional<z.ZodEnum<["chain_of_thought", "react", "reflexion", "tree_of_thought", "internal_debate", "analogical"]>>;
    /** Behavior parameter overrides for this domain. */
    defaultBehavior: z.ZodDefault<z.ZodObject<{
        reasoningDepth: z.ZodOptional<z.ZodNumber>;
        explorationVsExploitation: z.ZodOptional<z.ZodNumber>;
        verbosityLevel: z.ZodOptional<z.ZodNumber>;
        confidenceThreshold: z.ZodOptional<z.ZodNumber>;
        toolUsePreference: z.ZodOptional<z.ZodNumber>;
        creativityLevel: z.ZodOptional<z.ZodNumber>;
        proactiveSuggestion: z.ZodOptional<z.ZodBoolean>;
        maxPlanSteps: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reasoningDepth?: number | undefined;
        explorationVsExploitation?: number | undefined;
        verbosityLevel?: number | undefined;
        confidenceThreshold?: number | undefined;
        toolUsePreference?: number | undefined;
        creativityLevel?: number | undefined;
        proactiveSuggestion?: boolean | undefined;
        maxPlanSteps?: number | undefined;
    }, {
        reasoningDepth?: number | undefined;
        explorationVsExploitation?: number | undefined;
        verbosityLevel?: number | undefined;
        confidenceThreshold?: number | undefined;
        toolUsePreference?: number | undefined;
        creativityLevel?: number | undefined;
        proactiveSuggestion?: boolean | undefined;
        maxPlanSteps?: number | undefined;
    }>>;
    /** MCP servers this domain agent requires to function. */
    requiredMCPServers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Restrict which MCP tools the agent can call. Empty = all available. */
    toolAllowlist: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Domain tags for skill matching and memory retrieval. */
    domainTags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    systemPrompt: string;
    allowedIntents: string[];
    forbiddenTopics: string[];
    defaultBehavior: {
        reasoningDepth?: number | undefined;
        explorationVsExploitation?: number | undefined;
        verbosityLevel?: number | undefined;
        confidenceThreshold?: number | undefined;
        toolUsePreference?: number | undefined;
        creativityLevel?: number | undefined;
        proactiveSuggestion?: boolean | undefined;
        maxPlanSteps?: number | undefined;
    };
    requiredMCPServers: string[];
    toolAllowlist: string[];
    domainTags: string[];
    preferredStrategy?: "chain_of_thought" | "react" | "reflexion" | "tree_of_thought" | "internal_debate" | "analogical" | undefined;
}, {
    name: string;
    systemPrompt: string;
    allowedIntents?: string[] | undefined;
    forbiddenTopics?: string[] | undefined;
    preferredStrategy?: "chain_of_thought" | "react" | "reflexion" | "tree_of_thought" | "internal_debate" | "analogical" | undefined;
    defaultBehavior?: {
        reasoningDepth?: number | undefined;
        explorationVsExploitation?: number | undefined;
        verbosityLevel?: number | undefined;
        confidenceThreshold?: number | undefined;
        toolUsePreference?: number | undefined;
        creativityLevel?: number | undefined;
        proactiveSuggestion?: boolean | undefined;
        maxPlanSteps?: number | undefined;
    } | undefined;
    requiredMCPServers?: string[] | undefined;
    toolAllowlist?: string[] | undefined;
    domainTags?: string[] | undefined;
}>;
export type DomainPersona = z.infer<typeof DomainPersonaSchema>;
//# sourceMappingURL=domain-persona.d.ts.map