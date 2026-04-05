// @stem-agent/memory-system — public API

// Manager (IMemoryManager facade)
export { MemoryManager } from "./manager.js";

// Indexer
export { MemoryIndexer } from "./indexer.js";

// Episodic memory
export { EpisodicMemory, InMemoryEpisodicStore } from "./episodic/index.js";

// Semantic memory
export { SemanticMemory, InMemorySemanticStore } from "./semantic/index.js";

// Procedural memory
export { ProceduralMemory, InMemoryProceduralStore } from "./procedural/index.js";

// User context
export { UserContextManager, InMemoryUserContextStore } from "./user-context/index.js";

// Embeddings
export {
  cosineSimilarity,
  NoOpEmbeddingProvider,
  OpenAIEmbeddingProvider,
} from "./embeddings/index.js";
export type { IEmbeddingProvider } from "./embeddings/index.js";

// Errors
export { MemoryError, MemoryNotFoundError, EmbeddingError } from "./errors.js";

// Persistence (PostgreSQL + pgvector)
export {
  createPgPool,
  runMigrations,
  PgEpisodicStore,
  PgSemanticStore,
  PgProceduralStore,
  PgUserContextStore,
} from "./persistence/index.js";

// Utility tracking (ATLAS self-learning)
export { UtilityTracker } from "./utility-tracker.js";
export type { UtilityTrackerConfig } from "./utility-tracker.js";

// Retrieval ranking (ATLAS self-learning)
export { RetrievalRanker } from "./retrieval-ranker.js";
export type { RetrievalRankerConfig, RankerCandidate, ScoredResult } from "./retrieval-ranker.js";

// Consolidation engine (ATLAS self-learning)
export { ConsolidationEngine } from "./consolidation-engine.js";
export type { ConsolidationConfig, ConsolidationStats } from "./consolidation-engine.js";

// Config & store interfaces
export { MemorySystemConfigSchema } from "./types.js";
export type {
  MemorySystemConfig,
  IEpisodicStore,
  ISemanticStore,
  IProceduralStore,
  IUserContextStore,
} from "./types.js";
