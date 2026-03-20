import { z } from "zod";
// ---------------------------------------------------------------------------
// Agent Skill (for Agent Card)
// ---------------------------------------------------------------------------
export const AgentSkillSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    examples: z.array(z.string()).default([]),
});
// ---------------------------------------------------------------------------
// Security Scheme (A2A v0.3.0)
// ---------------------------------------------------------------------------
export const SecuritySchemeSchema = z.object({
    type: z.enum(["apiKey", "http", "oauth2"]),
    in: z.enum(["header", "query"]).optional(),
    name: z.string().optional(),
    scheme: z.string().optional(),
    bearerFormat: z.string().optional(),
});
// ---------------------------------------------------------------------------
// Agent Card (from design doc Sec 2.2 — A2A v0.3.0)
// ---------------------------------------------------------------------------
export const AgentCardSchema = z.object({
    agentId: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.string(),
    protocolVersion: z.string().default("0.3.0"),
    supportedProtocols: z
        .array(z.string())
        .default(["a2a/0.3.0", "openapi/3.1", "mcp/2025-11-25"]),
    skills: z.array(AgentSkillSchema).default([]),
    endpoint: z.string().url(),
    maxConcurrentTasks: z.number().int().positive().default(10),
    supportsStreaming: z.boolean().default(true),
    supportsPushNotifications: z.boolean().default(true),
    defaultInputModes: z.array(z.string()).default(["text/plain"]),
    defaultOutputModes: z.array(z.string()).default(["text/plain"]),
    securitySchemes: z.array(SecuritySchemeSchema).default([]),
    securityRequirements: z.array(z.record(z.array(z.string()))).default([]),
});
//# sourceMappingURL=agent-card.js.map