"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallerContextSchema = exports.CallerProfileSchema = exports.ProcedureSchema = exports.KnowledgeTripleSchema = exports.EpisodeSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Memory types (from design doc Sec 8)
// ---------------------------------------------------------------------------
/** Episodic memory record — a single interaction or event. */
exports.EpisodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.number(),
    actors: zod_1.z.array(zod_1.z.string()),
    actions: zod_1.z.array(zod_1.z.string()),
    context: zod_1.z.record(zod_1.z.unknown()).default({}),
    outcome: zod_1.z.string().optional(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    importance: zod_1.z.number().min(0).max(1).default(0.5),
    summary: zod_1.z.string().optional(),
});
/** Semantic memory — a knowledge triple. */
exports.KnowledgeTripleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    subject: zod_1.z.string(),
    predicate: zod_1.z.string(),
    object: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    source: zod_1.z.string().optional(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    createdAt: zod_1.z.number(),
    updatedAt: zod_1.z.number(),
    version: zod_1.z.number().int().default(1),
});
/** Procedural memory — a learned procedure or skill. */
exports.ProcedureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    steps: zod_1.z.array(zod_1.z.string()),
    preconditions: zod_1.z.array(zod_1.z.string()).default([]),
    postconditions: zod_1.z.array(zod_1.z.string()).default([]),
    successRate: zod_1.z.number().min(0).max(1).default(0),
    executionCount: zod_1.z.number().int().default(0),
    lastUsed: zod_1.z.number().optional(),
    embedding: zod_1.z.array(zod_1.z.number()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
/** Caller/user profile (from design doc Sec 7.2). */
exports.CallerProfileSchema = zod_1.z.object({
    callerId: zod_1.z.string(),
    philosophy: zod_1.z.object({
        pragmatismVsIdealism: zod_1.z.number().default(0.5),
        simplicityVsCompleteness: zod_1.z.number().default(0.5),
        depthVsBreadth: zod_1.z.number().default(0.5),
        riskTolerance: zod_1.z.number().default(0.5),
        innovationOrientation: zod_1.z.number().default(0.5),
    }),
    style: zod_1.z.object({
        formality: zod_1.z.number().default(0.5),
        verbosity: zod_1.z.number().default(0.5),
        technicalDepth: zod_1.z.number().default(0.5),
        examplesPreference: zod_1.z.number().default(0.5),
        preferredOutputFormat: zod_1.z.string().default("markdown"),
    }),
    habits: zod_1.z.object({
        typicalSessionLength: zod_1.z.number().default(30),
        iterationTendency: zod_1.z.number().default(0.5),
        questionAsking: zod_1.z.number().default(0.5),
        contextProviding: zod_1.z.number().default(0.5),
        peakHours: zod_1.z.array(zod_1.z.number().int()).default([]),
        commonTopics: zod_1.z.array(zod_1.z.string()).default([]),
    }),
    principles: zod_1.z.object({
        communicationStyle: zod_1.z.string().default("balanced"),
        detailLevel: zod_1.z.enum(["brief", "standard", "detailed"]).default("standard"),
        preferredResponseFormat: zod_1.z.string().default("markdown"),
        domainExpertise: zod_1.z.record(zod_1.z.number()).default({}),
        interactionGoals: zod_1.z.array(zod_1.z.string()).default([]),
    }).default({}),
    confidence: zod_1.z.number().min(0).max(1).default(0),
    totalInteractions: zod_1.z.number().int().default(0),
    satisfactionScores: zod_1.z.array(zod_1.z.number()).default([]),
    createdAt: zod_1.z.number().default(() => Date.now()),
    updatedAt: zod_1.z.number().default(() => Date.now()),
});
/** Session-scoped caller context. */
exports.CallerContextSchema = zod_1.z.object({
    callerId: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    currentGoals: zod_1.z.array(zod_1.z.string()).default([]),
    activeTasks: zod_1.z.array(zod_1.z.string()).default([]),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    role: zod_1.z.string().default("user"),
    profile: exports.CallerProfileSchema.optional(),
});
//# sourceMappingURL=memory.js.map