# Memory System (Layer 4) - Implementation Plan

## Overview

Build `packages/memory-system/` implementing 4 memory modules (episodic, semantic, procedural, user-context), a unified MemoryManager facade, an embedding service, and a memory indexer. All cross-layer types are imported from `@stem-agent/shared`. Storage uses in-memory Maps/arrays for unit tests, with interfaces ready for SQLite/vector backends.

## Design Decisions

1. **Storage abstraction**: Define a `MemoryStore` interface so each memory module receives its storage backend via DI. For the initial implementation and tests, provide in-memory stores. This avoids coupling to SQLite/pgvector at the library level while keeping the door open for real backends.
2. **Embedding service**: Define an `IEmbeddingProvider` interface. Ship a `NoOpEmbeddingProvider` (returns zero vectors) for tests and a stub `OpenAIEmbeddingProvider` skeleton. The memory modules accept an embedding provider via constructor injection.
3. **Vector similarity**: Implement cosine similarity in a small utility function. The in-memory stores use brute-force cosine search. Production backends (pgvector) would use ANN indexes.
4. **No heavy deps**: The package.json already lists only `pino`, `zod`, and `@stem-agent/shared`. We will not add SQLite or any database driver - the storage interfaces allow consumers to provide real backends. This keeps the package light and testable.
5. **Error classes**: Extend `BaseError` from shared for `MemoryError`, `MemoryNotFoundError`, `EmbeddingError`.

## File Structure

```
src/
  index.ts                    # Public API exports
  errors.ts                   # Memory-specific error classes
  types.ts                    # Internal config types, store interfaces
  manager.ts                  # MemoryManager (IMemoryManager facade)
  indexer.ts                  # MemoryIndexer (background maintenance)

  embeddings/
    index.ts                  # Re-exports
    provider.ts               # IEmbeddingProvider interface
    noop-provider.ts          # Zero-vector provider for tests
    cosine.ts                 # Cosine similarity utility

  episodic/
    index.ts                  # Re-exports
    store.ts                  # IEpisodicStore interface + InMemoryEpisodicStore
    episodic-memory.ts        # EpisodicMemory class

  semantic/
    index.ts                  # Re-exports
    store.ts                  # ISemanticStore interface + InMemorySemanticStore
    semantic-memory.ts        # SemanticMemory class

  procedural/
    index.ts                  # Re-exports
    store.ts                  # IProceduralStore interface + InMemoryProceduralStore
    procedural-memory.ts      # ProceduralMemory class

  user-context/
    index.ts                  # Re-exports
    store.ts                  # IUserContextStore interface + InMemoryUserContextStore
    user-context-manager.ts   # UserContextManager class

tests/
  episodic-memory.test.ts
  semantic-memory.test.ts
  procedural-memory.test.ts
  user-context.test.ts
  manager.test.ts
  cosine.test.ts
  indexer.test.ts
```

## Implementation Steps

### Step 1: Foundation files
- `src/errors.ts` - MemoryError, MemoryNotFoundError, EmbeddingError (extend BaseError)
- `src/types.ts` - MemorySystemConfig schema, store interfaces
- `src/embeddings/cosine.ts` - cosineSimilarity(a, b) utility
- `src/embeddings/provider.ts` - IEmbeddingProvider interface
- `src/embeddings/noop-provider.ts` - NoOpEmbeddingProvider
- `src/embeddings/index.ts` - re-exports
- Verify: `tests/cosine.test.ts` passes

### Step 2: Episodic Memory
- `src/episodic/store.ts` - IEpisodicStore interface + InMemoryEpisodicStore (append-only log, search by time range, vector similarity, keyword, actor)
- `src/episodic/episodic-memory.ts` - EpisodicMemory class: store(), search(), estimateImportance(), summarize()
- `src/episodic/index.ts` - re-exports
- Verify: `tests/episodic-memory.test.ts` passes

### Step 3: Semantic Memory
- `src/semantic/store.ts` - ISemanticStore interface + InMemorySemanticStore (CRUD on triples, vector search, versioning)
- `src/semantic/semantic-memory.ts` - SemanticMemory class: store(), search(), update(), delete(), importTriples(), exportTriples()
- `src/semantic/index.ts` - re-exports
- Verify: `tests/semantic-memory.test.ts` passes

### Step 4: Procedural Memory
- `src/procedural/store.ts` - IProceduralStore interface + InMemoryProceduralStore
- `src/procedural/procedural-memory.ts` - ProceduralMemory class: learn(), getBestProcedure(), recordOutcome(), deprecateUnreliable()
- `src/procedural/index.ts` - re-exports
- Verify: `tests/procedural-memory.test.ts` passes

### Step 5: User Context
- `src/user-context/store.ts` - IUserContextStore interface + InMemoryUserContextStore
- `src/user-context/user-context-manager.ts` - UserContextManager class: getProfile(), updateProfile(), getContext(), buildContextWithBudget(), forget(), privacy controls
- `src/user-context/index.ts` - re-exports
- Verify: `tests/user-context.test.ts` passes

### Step 6: Memory Manager + Indexer
- `src/manager.ts` - MemoryManager implementing IMemoryManager, delegates to all 4 modules
- `src/indexer.ts` - MemoryIndexer: reindex(), compress(), gc()
- Verify: `tests/manager.test.ts` and `tests/indexer.test.ts` pass

### Step 7: Public API + Build
- `src/index.ts` - export MemoryManager, all module classes, config types, store interfaces, embedding provider interface
- Run `npm run build` and `npm run test`
- Verify >80% coverage

### Step 8: ATLAS Self-Learning Integration

Adds utility-scored memories with outcome-driven retrieval and three-phase consolidation (ATLAS architecture).

**New files created:**
- `src/utility-tracker.ts` — EMA utility scoring: `u(m) ← u(m) + η·(r - u(m))`, sliding-window reward mean, significance detection. Config: `eta=0.1`, `rewardWindow=100`, `significanceThreshold=0.3`
- `src/retrieval-ranker.ts` — Composite retrieval scoring: `score = similarity + β·sigmoid(utility) + ρ·exp(-κ·age)`. Config: `beta=0.3`, `rho=0.2`, `kappa=1e-6`
- `src/consolidation-engine.ts` — Three-phase consolidation: promote (high-utility episodes → semantic triples via embedding clustering), merge (similar triples via weighted-average utility), prune (stale low-utility entries + hard capacity enforcement). Config: `uPromote=0.3`, `uPrune=-0.1`, `tMaxAge=7d`, `thetaMerge=0.85`, `episodicCapacity=1000`, `semanticCapacity=500`

**Store interface additions** (`src/types.ts`):
- `IEpisodicStore.get(id): Promise<Episode | null>`
- `IEpisodicStore.updateUtility(id, utility, retrievalCount): Promise<void>`
- `ISemanticStore.updateUtility(id, utility, retrievalCount): Promise<void>`
- `ISemanticStore.merge(ids: string[], merged: KnowledgeTriple): Promise<void>`

**Modified files:**
- `src/episodic/store.ts` — Added `get()` and `updateUtility()` to InMemoryEpisodicStore
- `src/semantic/store.ts` — Added `updateUtility()` and `merge()` to InMemorySemanticStore
- `src/episodic/episodic-memory.ts` — Injected UtilityTracker + RetrievalRanker; added `updateUtilityFromReward()`; search over-fetches 2x and re-ranks
- `src/semantic/semantic-memory.ts` — Same pattern as episodic
- `src/manager.ts` — Added `updateEpisodeUtility()` and `updateKnowledgeUtility()` delegating to memory modules
- `src/indexer.ts` — Delegates to ConsolidationEngine when available; falls back to legacy prune/dedup/extract
- `src/persistence/pg-episodic-store.ts` — Added `get()` and `updateUtility()` SQL methods
- `src/persistence/pg-semantic-store.ts` — Added `updateUtility()` and `merge()` with transaction
- `src/index.ts` — Exported all new classes and types

**New test files:**
- `src/__tests__/utility-tracker.test.ts` (7 tests)
- `src/__tests__/retrieval-ranker.test.ts` (5 tests)
- `src/__tests__/consolidation-engine.test.ts` (7 tests)
- `src/__tests__/store-utility.test.ts` (6 tests)

**Shared type changes** (`@stem-agent/shared` — `shared/src/types/memory.ts`):
- `Episode`: added `utility?: number`, `retrievalCount?: number`, `lastRetrieved?: number`
- `KnowledgeTriple`: added `utility?: number`, `sourceCount?: number`, `retrievalCount?: number`, `lastRetrieved?: number`
- `IMemoryManager`: added `updateEpisodeUtility(id, reward)` and `updateKnowledgeUtility(id, reward)`

Verify: 153 memory-system tests pass, all existing tests unaffected (new fields are optional).

## Key Interfaces (preview)

```typescript
// IEmbeddingProvider
interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
}

// IEpisodicStore
interface IEpisodicStore {
  append(episode: Episode): Promise<void>;
  getByTimeRange(start: number, end: number): Promise<Episode[]>;
  getByActor(actor: string): Promise<Episode[]>;
  searchByEmbedding(embedding: number[], limit: number): Promise<Episode[]>;
  searchByKeyword(keyword: string, limit: number): Promise<Episode[]>;
  delete(id: string): Promise<void>;
  deleteByActor(actor: string): Promise<void>;
  count(): Promise<number>;
}

// ISemanticStore
interface ISemanticStore {
  upsert(triple: KnowledgeTriple): Promise<void>;
  get(id: string): Promise<KnowledgeTriple | null>;
  searchByEmbedding(embedding: number[], limit: number): Promise<KnowledgeTriple[]>;
  searchBySubject(subject: string): Promise<KnowledgeTriple[]>;
  delete(id: string): Promise<void>;
  getAll(): Promise<KnowledgeTriple[]>;
  count(): Promise<number>;
}

// IProceduralStore
interface IProceduralStore {
  upsert(procedure: Procedure): Promise<void>;
  get(id: string): Promise<Procedure | null>;
  getByName(name: string): Promise<Procedure | null>;
  searchByEmbedding(embedding: number[], limit: number): Promise<Procedure[]>;
  searchByTags(tags: string[]): Promise<Procedure[]>;
  getAll(): Promise<Procedure[]>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

// IUserContextStore
interface IUserContextStore {
  getProfile(callerId: string): Promise<CallerProfile | null>;
  upsertProfile(profile: CallerProfile): Promise<void>;
  deleteProfile(callerId: string): Promise<void>;
  getSession(callerId: string, sessionId: string): Promise<CallerContext | null>;
  upsertSession(context: CallerContext): Promise<void>;
  deleteAllForCaller(callerId: string): Promise<void>;
}
```
