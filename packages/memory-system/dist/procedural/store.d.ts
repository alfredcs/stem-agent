import type { Procedure } from "@stem-agent/shared";
import type { IProceduralStore } from "../types.js";
/**
 * In-memory procedural store for learned procedures/skills.
 */
export declare class InMemoryProceduralStore implements IProceduralStore {
    private readonly procedures;
    upsert(procedure: Procedure): Promise<void>;
    get(id: string): Promise<Procedure | null>;
    getByName(name: string): Promise<Procedure | null>;
    searchByEmbedding(embedding: number[], limit: number): Promise<Procedure[]>;
    searchByTags(tags: string[]): Promise<Procedure[]>;
    getAll(): Promise<Procedure[]>;
    delete(id: string): Promise<void>;
    count(): Promise<number>;
}
//# sourceMappingURL=store.d.ts.map