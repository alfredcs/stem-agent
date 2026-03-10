import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import type { MemorySystemConfig } from "../types.js";

/**
 * Procedural memory — learned procedures, workflows, and skills.
 *
 * Supports a learning loop: extract procedures from successful executions,
 * track success/failure rates, and auto-deprecate unreliable procedures.
 */
export class ProceduralMemory {
  private readonly store: IProceduralStore;
  private readonly embeddings: IEmbeddingProvider;
  private readonly log: Logger;
  private readonly deprecationThreshold: number;
  private readonly minExecutions: number;

  constructor(
    store: IProceduralStore,
    embeddings: IEmbeddingProvider,
    config?: Partial<MemorySystemConfig>,
    logger?: Logger,
  ) {
    this.store = store;
    this.embeddings = embeddings;
    this.deprecationThreshold = config?.procedureDeprecationThreshold ?? 0.2;
    this.minExecutions = config?.procedureMinExecutions ?? 5;
    this.log = logger ?? createLogger("procedural-memory");
  }

  /** Learn a new procedure, computing its embedding. */
  async learn(procedure: Procedure): Promise<void> {
    const text = `${procedure.name} ${procedure.description} ${procedure.steps.join(" ")}`;
    const embedding = await this.embeddings.embed(text);
    await this.store.upsert({ ...procedure, embedding });
    this.log.debug({ id: procedure.id, name: procedure.name }, "procedure learned");
  }

  /** Get the best matching procedure for a task description. */
  async getBestProcedure(taskDescription: string): Promise<Procedure | null> {
    const embedding = await this.embeddings.embed(taskDescription);
    const results = await this.store.searchByEmbedding(embedding, 5);
    // Filter out deprecated (low success rate) procedures and pick the best
    const viable = results.filter(
      (p) =>
        p.executionCount < this.minExecutions ||
        p.successRate >= this.deprecationThreshold,
    );
    return viable[0] ?? null;
  }

  /**
   * Record the outcome of a procedure execution.
   * Updates success rate and execution count.
   */
  async recordOutcome(
    procedureId: string,
    success: boolean,
  ): Promise<void> {
    const proc = await this.store.get(procedureId);
    if (!proc) return;

    const newCount = proc.executionCount + 1;
    // Running average for success rate
    const newRate =
      (proc.successRate * proc.executionCount + (success ? 1 : 0)) / newCount;

    await this.store.upsert({
      ...proc,
      executionCount: newCount,
      successRate: newRate,
      lastUsed: Date.now(),
    });

    this.log.debug(
      { id: procedureId, success, newRate: newRate.toFixed(2) },
      "procedure outcome recorded",
    );
  }

  /**
   * Deprecate procedures that have been executed enough times
   * but have a success rate below the threshold.
   * Returns the IDs of deprecated procedures.
   */
  async deprecateUnreliable(): Promise<string[]> {
    const all = await this.store.getAll();
    const deprecated: string[] = [];

    for (const proc of all) {
      if (
        proc.executionCount >= this.minExecutions &&
        proc.successRate < this.deprecationThreshold
      ) {
        await this.store.delete(proc.id);
        deprecated.push(proc.id);
        this.log.info(
          { id: proc.id, name: proc.name, successRate: proc.successRate },
          "procedure deprecated",
        );
      }
    }

    return deprecated;
  }

  /** Search procedures by tags. */
  async searchByTags(tags: string[]): Promise<Procedure[]> {
    return this.store.searchByTags(tags);
  }

  /** Get a procedure by ID. */
  async get(id: string): Promise<Procedure | null> {
    return this.store.get(id);
  }

  /** Get a procedure by name. */
  async getByName(name: string): Promise<Procedure | null> {
    return this.store.getByName(name);
  }

  /** Delete a procedure. */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /** Get total procedure count. */
  async count(): Promise<number> {
    return this.store.count();
  }
}
