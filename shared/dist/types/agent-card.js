"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentCardSchema = exports.SecuritySchemeSchema = exports.AgentSkillSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Agent Skill (for Agent Card)
// ---------------------------------------------------------------------------
exports.AgentSkillSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    examples: zod_1.z.array(zod_1.z.string()).default([]),
});
// ---------------------------------------------------------------------------
// Security Scheme (A2A v0.3.0)
// ---------------------------------------------------------------------------
exports.SecuritySchemeSchema = zod_1.z.object({
    type: zod_1.z.enum(["apiKey", "http", "oauth2"]),
    in: zod_1.z.enum(["header", "query"]).optional(),
    name: zod_1.z.string().optional(),
    scheme: zod_1.z.string().optional(),
    bearerFormat: zod_1.z.string().optional(),
});
// ---------------------------------------------------------------------------
// Agent Card (from design doc Sec 2.2 — A2A v0.3.0)
// ---------------------------------------------------------------------------
exports.AgentCardSchema = zod_1.z.object({
    agentId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    version: zod_1.z.string(),
    protocolVersion: zod_1.z.string().default("0.3.0"),
    supportedProtocols: zod_1.z
        .array(zod_1.z.string())
        .default(["a2a/0.3.0", "openapi/3.1", "mcp/2025-11-25"]),
    skills: zod_1.z.array(exports.AgentSkillSchema).default([]),
    endpoint: zod_1.z.string().url(),
    maxConcurrentTasks: zod_1.z.number().int().positive().default(10),
    supportsStreaming: zod_1.z.boolean().default(true),
    supportsPushNotifications: zod_1.z.boolean().default(true),
    defaultInputModes: zod_1.z.array(zod_1.z.string()).default(["text/plain"]),
    defaultOutputModes: zod_1.z.array(zod_1.z.string()).default(["text/plain"]),
    securitySchemes: zod_1.z.array(exports.SecuritySchemeSchema).default([]),
    securityRequirements: zod_1.z.array(zod_1.z.record(zod_1.z.array(zod_1.z.string()))).default([]),
});
//# sourceMappingURL=agent-card.js.map