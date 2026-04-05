import { z } from "zod";

// ---------------------------------------------------------------------------
// Memory types (from design doc Sec 8)
// ---------------------------------------------------------------------------

/** Episodic memory record — a single interaction or event. */
export const EpisodeSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(),
  actors: z.array(z.string()),
  actions: z.array(z.string()),
  context: z.record(z.unknown()).default({}),
  outcome: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  importance: z.number().min(0).max(1).default(0.5),
  summary: z.string().optional(),
  /** Dynamic utility score updated from outcome feedback (ATLAS). */
  utility: z.number().optional(),
  /** Number of times this memory was retrieved. */
  retrievalCount: z.number().int().optional(),
  /** Timestamp of last retrieval. */
  lastRetrieved: z.number().optional(),
});

export type Episode = z.infer<typeof EpisodeSchema>;

/** Semantic memory — a knowledge triple. */
export const KnowledgeTripleSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  predicate: z.string(),
  object: z.string(),
  confidence: z.number().min(0).max(1).default(1.0),
  source: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().int().default(1),
  /** Dynamic utility score updated from outcome feedback (ATLAS). */
  utility: z.number().optional(),
  /** Number of source episodes merged into this triple. */
  sourceCount: z.number().int().optional(),
  /** Number of times this triple was retrieved. */
  retrievalCount: z.number().int().optional(),
  /** Timestamp of last retrieval. */
  lastRetrieved: z.number().optional(),
});

export type KnowledgeTriple = z.infer<typeof KnowledgeTripleSchema>;

/** Procedural memory — a learned procedure or skill. */
export const ProcedureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  steps: z.array(z.string()),
  preconditions: z.array(z.string()).default([]),
  postconditions: z.array(z.string()).default([]),
  successRate: z.number().min(0).max(1).default(0),
  executionCount: z.number().int().default(0),
  lastUsed: z.number().optional(),
  embedding: z.array(z.number()).optional(),
  tags: z.array(z.string()).default([]),
});

export type Procedure = z.infer<typeof ProcedureSchema>;

/** Caller/user profile (from design doc Sec 7.2). */
export const CallerProfileSchema = z.object({
  callerId: z.string(),
  philosophy: z.object({
    pragmatismVsIdealism: z.number().default(0.5),
    simplicityVsCompleteness: z.number().default(0.5),
    depthVsBreadth: z.number().default(0.5),
    riskTolerance: z.number().default(0.5),
    innovationOrientation: z.number().default(0.5),
  }),
  style: z.object({
    formality: z.number().default(0.5),
    verbosity: z.number().default(0.5),
    technicalDepth: z.number().default(0.5),
    examplesPreference: z.number().default(0.5),
    preferredOutputFormat: z.string().default("markdown"),
  }),
  habits: z.object({
    typicalSessionLength: z.number().default(30),
    iterationTendency: z.number().default(0.5),
    questionAsking: z.number().default(0.5),
    contextProviding: z.number().default(0.5),
    peakHours: z.array(z.number().int()).default([]),
    commonTopics: z.array(z.string()).default([]),
  }),
  principles: z.object({
    communicationStyle: z.string().default("balanced"),
    detailLevel: z.enum(["brief", "standard", "detailed"]).default("standard"),
    preferredResponseFormat: z.string().default("markdown"),
    domainExpertise: z.record(z.number()).default({}),
    interactionGoals: z.array(z.string()).default([]),
  }).default({}),
  confidence: z.number().min(0).max(1).default(0),
  totalInteractions: z.number().int().default(0),
  satisfactionScores: z.array(z.number()).default([]),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
});

export type CallerProfile = z.infer<typeof CallerProfileSchema>;

/** Session-scoped caller context. */
export const CallerContextSchema = z.object({
  callerId: z.string(),
  sessionId: z.string(),
  currentGoals: z.array(z.string()).default([]),
  activeTasks: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  role: z.string().default("user"),
  profile: CallerProfileSchema.optional(),
});

export type CallerContext = z.infer<typeof CallerContextSchema>;

// ---------------------------------------------------------------------------
// Memory Manager Interface — Layer 4 public contract
// ---------------------------------------------------------------------------

export interface IMemoryManager {
  /** Store an episode in episodic memory. */
  remember(episode: Episode): Promise<void>;

  /** Recall relevant memories for a query. */
  recall(query: string, limit?: number): Promise<Episode[]>;

  /** Learn a new procedure from a successful execution. */
  learn(procedure: Procedure): Promise<void>;

  /** Assemble context for a caller within a token budget. */
  getContext(callerId: string, sessionId: string): Promise<CallerContext>;

  /** Delete caller data (GDPR forget-me). */
  forget(callerId: string): Promise<void>;

  /** Store or update a knowledge triple. */
  storeKnowledge(triple: KnowledgeTriple): Promise<void>;

  /** Search knowledge by similarity. */
  searchKnowledge(query: string, limit?: number): Promise<KnowledgeTriple[]>;

  /** Get or create a caller profile. */
  getCallerProfile(callerId: string): Promise<CallerProfile>;

  /** Update caller profile from interaction. */
  updateCallerProfile(
    callerId: string,
    interaction: Record<string, unknown>,
  ): Promise<void>;

  /** Get best matching procedure for a task. */
  getBestProcedure(taskDescription: string): Promise<Procedure | null>;

  /** Update utility score for a retrieved episodic memory from outcome reward (ATLAS feedback loop). */
  updateEpisodeUtility(id: string, reward: number): Promise<void>;

  /** Update utility score for a retrieved semantic memory from outcome reward (ATLAS feedback loop). */
  updateKnowledgeUtility(id: string, reward: number): Promise<void>;

  /** Shutdown and flush. */
  shutdown(): Promise<void>;
}
