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
export { cosineSimilarity, NoOpEmbeddingProvider, OpenAIEmbeddingProvider, } from "./embeddings/index.js";
// Errors
export { MemoryError, MemoryNotFoundError, EmbeddingError } from "./errors.js";
// Persistence (PostgreSQL + pgvector)
export { createPgPool, runMigrations, PgEpisodicStore, PgSemanticStore, PgProceduralStore, PgUserContextStore, } from "./persistence/index.js";
// Config & store interfaces
export { MemorySystemConfigSchema } from "./types.js";
//# sourceMappingURL=index.js.map