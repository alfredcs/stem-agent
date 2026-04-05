import type { IMemoryManager, Episode, KnowledgeTriple, Procedure, CallerProfile, CallerContext } from "@stem-agent/shared";
import type { Logger } from "@stem-agent/shared";
import { EpisodicMemory } from "./episodic/episodic-memory.js";
import { SemanticMemory } from "./semantic/semantic-memory.js";
import { ProceduralMemory } from "./procedural/procedural-memory.js";
import { UserContextManager } from "./user-context/user-context-manager.js";
import type { MemoryIndexer } from "./indexer.js";
/**
 * Unified facade implementing IMemoryManager from shared types.
 * Delegates to specialized memory modules for each operation.
 */
export declare class MemoryManager implements IMemoryManager {
    private readonly episodic;
    private readonly semantic;
    private readonly procedural;
    private readonly userContext;
    private readonly indexer;
    private readonly log;
    constructor(deps: {
        episodic: EpisodicMemory;
        semantic: SemanticMemory;
        procedural: ProceduralMemory;
        userContext: UserContextManager;
        indexer?: MemoryIndexer;
        logger?: Logger;
    });
    /** Store an episode in episodic memory. */
    remember(episode: Episode): Promise<void>;
    /** Recall relevant memories for a query. */
    recall(query: string, limit?: number): Promise<Episode[]>;
    /** Learn a new procedure from a successful execution. */
    learn(procedure: Procedure): Promise<void>;
    /** Assemble context for a caller within a session. */
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
    updateCallerProfile(callerId: string, interaction: Record<string, unknown>): Promise<void>;
    /** Get best matching procedure for a task. */
    getBestProcedure(taskDescription: string): Promise<Procedure | null>;
    /** Update utility score for a retrieved episodic memory from outcome reward. */
    updateEpisodeUtility(id: string, reward: number): Promise<void>;
    /** Update utility score for a retrieved semantic memory from outcome reward. */
    updateKnowledgeUtility(id: string, reward: number): Promise<void>;
    /** Shutdown and flush. */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map