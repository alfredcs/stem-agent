import { createLogger } from "@stem-agent/shared";
/**
 * Unified facade implementing IMemoryManager from shared types.
 * Delegates to specialized memory modules for each operation.
 */
export class MemoryManager {
    episodic;
    semantic;
    procedural;
    userContext;
    indexer;
    log;
    constructor(deps) {
        this.episodic = deps.episodic;
        this.semantic = deps.semantic;
        this.procedural = deps.procedural;
        this.userContext = deps.userContext;
        this.indexer = deps.indexer ?? null;
        this.log = deps.logger ?? createLogger("memory-manager");
    }
    /** Store an episode in episodic memory. */
    async remember(episode) {
        await this.episodic.store(episode);
    }
    /** Recall relevant memories for a query. */
    async recall(query, limit) {
        return this.episodic.search(query, limit);
    }
    /** Learn a new procedure from a successful execution. */
    async learn(procedure) {
        await this.procedural.learn(procedure);
    }
    /** Assemble context for a caller within a session. */
    async getContext(callerId, sessionId) {
        return this.userContext.getContext(callerId, sessionId);
    }
    /** Delete caller data (GDPR forget-me). */
    async forget(callerId) {
        await this.userContext.forget(callerId);
        await this.episodic.deleteByActor(callerId);
        this.log.info({ callerId }, "all caller data forgotten");
    }
    /** Store or update a knowledge triple. */
    async storeKnowledge(triple) {
        await this.semantic.store(triple);
    }
    /** Search knowledge by similarity. */
    async searchKnowledge(query, limit) {
        return this.semantic.search(query, limit);
    }
    /** Get or create a caller profile. */
    async getCallerProfile(callerId) {
        return this.userContext.getProfile(callerId);
    }
    /** Update caller profile from interaction. */
    async updateCallerProfile(callerId, interaction) {
        await this.userContext.updateProfile(callerId, interaction);
    }
    /** Get best matching procedure for a task. */
    async getBestProcedure(taskDescription) {
        return this.procedural.getBestProcedure(taskDescription);
    }
    /** Update utility score for a retrieved episodic memory from outcome reward. */
    async updateEpisodeUtility(id, reward) {
        await this.episodic.updateUtilityFromReward(id, reward);
    }
    /** Update utility score for a retrieved semantic memory from outcome reward. */
    async updateKnowledgeUtility(id, reward) {
        await this.semantic.updateUtilityFromReward(id, reward);
    }
    /** Shutdown and flush. */
    async shutdown() {
        if (this.indexer) {
            this.indexer.stop();
        }
        this.log.info("memory manager shut down");
    }
}
//# sourceMappingURL=manager.js.map