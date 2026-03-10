import { z } from "zod";
import type {
  Episode,
  KnowledgeTriple,
  Procedure,
  CallerProfile,
  CallerContext,
} from "@stem-agent/shared";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const MemorySystemConfigSchema = z.object({
  /** Embedding dimensions (must match provider). */
  embeddingDimensions: z.number().int().positive().default(1536),
  /** Number of interactions between consolidation runs. */
  consolidationInterval: z.number().int().positive().default(10),
  /** Days after which episodic memories are auto-summarized. */
  autoSummarizeDays: z.number().positive().default(7),
  /** Default limit for similarity search results. */
  defaultSearchLimit: z.number().int().positive().default(10),
  /** Success rate threshold below which procedures are deprecated. */
  procedureDeprecationThreshold: z.number().min(0).max(1).default(0.2),
  /** Minimum executions before a procedure can be deprecated. */
  procedureMinExecutions: z.number().int().positive().default(5),
  /** EMA learning rate for caller profile updates. */
  profileLearningRate: z.number().min(0).max(1).default(0.1),
});

export type MemorySystemConfig = z.infer<typeof MemorySystemConfigSchema>;

// ---------------------------------------------------------------------------
// Store interfaces (DI boundaries for each memory module)
// ---------------------------------------------------------------------------

/** Append-only store for episodic memories. */
export interface IEpisodicStore {
  append(episode: Episode): Promise<void>;
  getByTimeRange(start: number, end: number): Promise<Episode[]>;
  getByActor(actor: string): Promise<Episode[]>;
  searchByEmbedding(embedding: number[], limit: number): Promise<Episode[]>;
  searchByKeyword(keyword: string, limit: number): Promise<Episode[]>;
  delete(id: string): Promise<void>;
  deleteByActor(actor: string): Promise<void>;
  count(): Promise<number>;
  getAll(): Promise<Episode[]>;
}

/** Knowledge-triple store for semantic memory. */
export interface ISemanticStore {
  upsert(triple: KnowledgeTriple): Promise<void>;
  get(id: string): Promise<KnowledgeTriple | null>;
  searchByEmbedding(
    embedding: number[],
    limit: number,
  ): Promise<KnowledgeTriple[]>;
  searchBySubject(subject: string): Promise<KnowledgeTriple[]>;
  delete(id: string): Promise<void>;
  getAll(): Promise<KnowledgeTriple[]>;
  count(): Promise<number>;
}

/** Store for procedural memories (learned skills). */
export interface IProceduralStore {
  upsert(procedure: Procedure): Promise<void>;
  get(id: string): Promise<Procedure | null>;
  getByName(name: string): Promise<Procedure | null>;
  searchByEmbedding(embedding: number[], limit: number): Promise<Procedure[]>;
  searchByTags(tags: string[]): Promise<Procedure[]>;
  getAll(): Promise<Procedure[]>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

/** Store for per-user profiles and session contexts. */
export interface IUserContextStore {
  getProfile(callerId: string): Promise<CallerProfile | null>;
  upsertProfile(profile: CallerProfile): Promise<void>;
  deleteProfile(callerId: string): Promise<void>;
  getSession(
    callerId: string,
    sessionId: string,
  ): Promise<CallerContext | null>;
  upsertSession(context: CallerContext): Promise<void>;
  deleteAllForCaller(callerId: string): Promise<void>;
}
