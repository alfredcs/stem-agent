import type { MandateRecord, MandateStatus } from "@stem-agent/shared";
/**
 * In-memory store for AP2 mandate records.
 * Provides CRUD and audit trail queries.
 */
export declare class AP2MandateStore {
    private readonly mandates;
    get(id: string): MandateRecord | undefined;
    save(record: MandateRecord): void;
    updateStatus(id: string, status: MandateStatus): MandateRecord | undefined;
    listByPrincipal(principalId: string): MandateRecord[];
    listAll(): MandateRecord[];
}
//# sourceMappingURL=ap2-mandate-store.d.ts.map