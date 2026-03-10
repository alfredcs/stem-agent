import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";
import type { IEmbeddingProvider } from "../embeddings/provider.js";
import type { Logger } from "@stem-agent/shared";
import type { MemorySystemConfig } from "../types.js";
/**
 * Procedural memory — learned procedures, workflows, and skills.
 *
 * Supports a learning loop: extract procedures from successful executions,
 * track success/failure rates, and auto-deprecate unreliable procedures.
 */
export declare class ProceduralMemory {
    private readonly store;
    private readonly embeddings;
    private readonly log;
    private readonly deprecationThreshold;
    private readonly minExecutions;
    constructor(store: IProceduralStore, embeddings: IEmbeddingProvider, config?: Partial<MemorySystemConfig>, logger?: Logger);
    /** Learn a new procedure, computing its embedding. */
    learn(procedure: Procedure): Promise<void>;
    /** Get the best matching procedure for a task description. */
    getBestProcedure(taskDescription: string): Promise<Procedure | null>;
    /**
     * Record the outcome of a procedure execution.
     * Updates success rate and execution count.
     */
    recordOutcome(procedureId: string, success: boolean): Promise<void>;
    /**
     * Deprecate procedures that have been executed enough times
     * but have a success rate below the threshold.
     * Returns the IDs of deprecated procedures.
     */
    deprecateUnreliable(): Promise<string[]>;
    /** Search procedures by tags. */
    searchByTags(tags: string[]): Promise<Procedure[]>;
    /** Get a procedure by ID. */
    get(id: string): Promise<Procedure | null>;
    /** Get a procedure by name. */
    getByName(name: string): Promise<Procedure | null>;
    /** Delete a procedure. */
    delete(id: string): Promise<void>;
    /** Get total procedure count. */
    count(): Promise<number>;
}
//# sourceMappingURL=procedural-memory.d.ts.map