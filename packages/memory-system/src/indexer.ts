import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import type { IEpisodicStore, ISemanticStore, IProceduralStore } from "./types.js";
import type { ConsolidationEngine } from "./consolidation-engine.js";

/**
 * Background memory indexer for re-indexing, compression, and garbage collection.
 *
 * In production this would run on a timer. For simplicity the methods
 * are exposed for manual/test invocation and an optional interval-based loop.
 */
export class MemoryIndexer {
  private readonly episodicStore: IEpisodicStore;
  private readonly semanticStore: ISemanticStore;
  private readonly proceduralStore: IProceduralStore;
  private readonly consolidationEngine: ConsolidationEngine | null;
  private readonly log: Logger;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    stores: {
      episodic: IEpisodicStore;
      semantic: ISemanticStore;
      procedural: IProceduralStore;
    },
    logger?: Logger,
    consolidationEngine?: ConsolidationEngine,
  ) {
    this.episodicStore = stores.episodic;
    this.semanticStore = stores.semantic;
    this.proceduralStore = stores.procedural;
    this.consolidationEngine = consolidationEngine ?? null;
    this.log = logger ?? createLogger("memory-indexer");
  }

  /**
   * Prune old, low-importance episodic memories.
   * Keeps the top `keepPercent`% by importance.
   */
  async pruneEpisodic(keepPercent = 80): Promise<number> {
    const all = await this.episodicStore.getAll();
    if (all.length === 0) return 0;

    const sorted = [...all].sort((a, b) => b.importance - a.importance);
    const keepCount = Math.ceil((all.length * keepPercent) / 100);
    const toDelete = sorted.slice(keepCount);

    for (const ep of toDelete) {
      await this.episodicStore.delete(ep.id);
    }

    this.log.info(
      { total: all.length, pruned: toDelete.length },
      "episodic memories pruned",
    );
    return toDelete.length;
  }

  /**
   * Remove duplicate semantic triples (same subject+predicate+object).
   * Keeps the one with the highest version.
   */
  async deduplicateSemantic(): Promise<number> {
    const all = await this.semanticStore.getAll();
    const seen = new Map<string, { id: string; version: number }>();
    const toDelete: string[] = [];

    for (const triple of all) {
      const key = `${triple.subject}|${triple.predicate}|${triple.object}`;
      const existing = seen.get(key);
      if (existing) {
        if (triple.version > existing.version) {
          toDelete.push(existing.id);
          seen.set(key, { id: triple.id, version: triple.version });
        } else {
          toDelete.push(triple.id);
        }
      } else {
        seen.set(key, { id: triple.id, version: triple.version });
      }
    }

    for (const id of toDelete) {
      await this.semanticStore.delete(id);
    }

    this.log.info({ duplicatesRemoved: toDelete.length }, "semantic dedup complete");
    return toDelete.length;
  }

  /** Get a summary of current memory counts. */
  async stats(): Promise<{
    episodic: number;
    semantic: number;
    procedural: number;
  }> {
    const [episodic, semantic, procedural] = await Promise.all([
      this.episodicStore.count(),
      this.semanticStore.count(),
      this.proceduralStore.count(),
    ]);
    return { episodic, semantic, procedural };
  }

  /** Start a periodic maintenance loop (interval in ms). */
  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runMaintenance();
    }, intervalMs);
    this.log.info({ intervalMs }, "indexer started");
  }

  /** Stop the periodic maintenance loop. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log.info("indexer stopped");
    }
  }

  /**
   * Extract repeated patterns from episodic memory into semantic triples.
   * Groups episodes by actor+outcome; actions appearing ≥3 times become triples.
   */
  async extractPatterns(): Promise<number> {
    const all = await this.episodicStore.getAll();
    if (all.length < 3) return 0;

    // Group episodes by first actor + outcome pattern
    const groups = new Map<string, typeof all>();
    for (const ep of all) {
      const actor = ep.actors[0] ?? "unknown";
      const outcome = ep.outcome ?? "unknown";
      const key = `${actor}|${outcome}`;
      const group = groups.get(key);
      if (group) {
        group.push(ep);
      } else {
        groups.set(key, [ep]);
      }
    }

    let created = 0;
    const { randomUUID } = await import("node:crypto");
    const now = Date.now();

    for (const [key, episodes] of groups) {
      if (episodes.length < 3) continue;

      const [actor, outcome] = key.split("|");
      // Find common actions across episodes
      const actionCounts = new Map<string, number>();
      for (const ep of episodes) {
        for (const action of ep.actions) {
          actionCounts.set(action, (actionCounts.get(action) ?? 0) + 1);
        }
      }

      for (const [action, count] of actionCounts) {
        if (count < 3) continue;

        await this.semanticStore.upsert({
          id: randomUUID(),
          subject: actor!,
          predicate: action,
          object: outcome!,
          confidence: Math.min(count / episodes.length, 1),
          source: "pattern_extraction",
          createdAt: now,
          updatedAt: now,
          version: 1,
          sourceCount: count,
          retrievalCount: 0,
        });
        created++;
      }
    }

    this.log.info({ patternsExtracted: created }, "pattern extraction complete");
    return created;
  }

  /**
   * Extract successful action strategies from episodic memory into procedures.
   * Finds episodes with successful outcomes sharing identical action sequences.
   */
  async extractStrategies(): Promise<number> {
    const all = await this.episodicStore.getAll();
    // Filter to successful episodes (outcome contains "completed" or "success")
    const successful = all.filter(
      (ep) => ep.outcome && (ep.outcome.includes("completed") || ep.outcome.includes("success")),
    );
    if (successful.length < 3) return 0;

    // Group by action sequence signature
    const groups = new Map<string, typeof successful>();
    for (const ep of successful) {
      const sig = ep.actions.join("|");
      if (sig.length === 0) continue;
      const group = groups.get(sig);
      if (group) {
        group.push(ep);
      } else {
        groups.set(sig, [ep]);
      }
    }

    let created = 0;
    const { randomUUID } = await import("node:crypto");

    for (const [_sig, episodes] of groups) {
      if (episodes.length < 3) continue;

      const representative = episodes[0];
      await this.proceduralStore.upsert({
        id: randomUUID(),
        name: `strategy_${representative.actions[0] ?? "unknown"}_${Date.now()}`,
        description: `Extracted strategy from ${episodes.length} successful episodes`,
        steps: representative.actions,
        preconditions: [],
        postconditions: [],
        successRate: 1.0,
        executionCount: episodes.length,
        lastUsed: Date.now(),
        tags: ["extracted"],
      });
      created++;
    }

    this.log.info({ strategiesExtracted: created }, "strategy extraction complete");
    return created;
  }

  /** Run all maintenance tasks once. */
  async runMaintenance(): Promise<void> {
    try {
      if (this.consolidationEngine) {
        // ATLAS-style consolidation: promote/merge/prune with capacity bounds
        await this.consolidationEngine.consolidate();
      } else {
        // Legacy maintenance: prune, dedup, extract patterns
        await this.pruneEpisodic();
        await this.deduplicateSemantic();
        await this.extractPatterns();
      }
      // Always extract strategies — feeds STEM's procedural memory / skill system
      await this.extractStrategies();
    } catch (err) {
      this.log.error({ err }, "maintenance run failed");
    }
  }
}
