import type {
  IMemoryManager,
  Episode,
  KnowledgeTriple,
  Procedure,
  CallerProfile,
  CallerContext,
} from "@stem-agent/shared";
import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import { EpisodicMemory } from "./episodic/episodic-memory.js";
import { SemanticMemory } from "./semantic/semantic-memory.js";
import { ProceduralMemory } from "./procedural/procedural-memory.js";
import { UserContextManager } from "./user-context/user-context-manager.js";
import type { MemoryIndexer } from "./indexer.js";

/**
 * Unified facade implementing IMemoryManager from shared types.
 * Delegates to specialized memory modules for each operation.
 */
export class MemoryManager implements IMemoryManager {
  private readonly episodic: EpisodicMemory;
  private readonly semantic: SemanticMemory;
  private readonly procedural: ProceduralMemory;
  private readonly userContext: UserContextManager;
  private readonly indexer: MemoryIndexer | null;
  private readonly log: Logger;

  constructor(deps: {
    episodic: EpisodicMemory;
    semantic: SemanticMemory;
    procedural: ProceduralMemory;
    userContext: UserContextManager;
    indexer?: MemoryIndexer;
    logger?: Logger;
  }) {
    this.episodic = deps.episodic;
    this.semantic = deps.semantic;
    this.procedural = deps.procedural;
    this.userContext = deps.userContext;
    this.indexer = deps.indexer ?? null;
    this.log = deps.logger ?? createLogger("memory-manager");
  }

  /** Store an episode in episodic memory. */
  async remember(episode: Episode): Promise<void> {
    await this.episodic.store(episode);
  }

  /** Recall relevant memories for a query. */
  async recall(query: string, limit?: number): Promise<Episode[]> {
    return this.episodic.search(query, limit);
  }

  /** Learn a new procedure from a successful execution. */
  async learn(procedure: Procedure): Promise<void> {
    await this.procedural.learn(procedure);
  }

  /** Assemble context for a caller within a session. */
  async getContext(callerId: string, sessionId: string): Promise<CallerContext> {
    return this.userContext.getContext(callerId, sessionId);
  }

  /** Delete caller data (GDPR forget-me). */
  async forget(callerId: string): Promise<void> {
    await this.userContext.forget(callerId);
    await this.episodic.deleteByActor(callerId);
    this.log.info({ callerId }, "all caller data forgotten");
  }

  /** Store or update a knowledge triple. */
  async storeKnowledge(triple: KnowledgeTriple): Promise<void> {
    await this.semantic.store(triple);
  }

  /** Search knowledge by similarity. */
  async searchKnowledge(
    query: string,
    limit?: number,
  ): Promise<KnowledgeTriple[]> {
    return this.semantic.search(query, limit);
  }

  /** Get or create a caller profile. */
  async getCallerProfile(callerId: string): Promise<CallerProfile> {
    return this.userContext.getProfile(callerId);
  }

  /** Update caller profile from interaction. */
  async updateCallerProfile(
    callerId: string,
    interaction: Record<string, unknown>,
  ): Promise<void> {
    await this.userContext.updateProfile(callerId, interaction);
  }

  /** Get best matching procedure for a task. */
  async getBestProcedure(taskDescription: string): Promise<Procedure | null> {
    return this.procedural.getBestProcedure(taskDescription);
  }

  /** Shutdown and flush. */
  async shutdown(): Promise<void> {
    if (this.indexer) {
      this.indexer.stop();
    }
    this.log.info("memory manager shut down");
  }
}
