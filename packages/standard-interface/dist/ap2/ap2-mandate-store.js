/**
 * In-memory store for AP2 mandate records.
 * Provides CRUD and audit trail queries.
 */
export class AP2MandateStore {
    mandates = new Map();
    get(id) {
        return this.mandates.get(id);
    }
    save(record) {
        this.mandates.set(record.id, record);
    }
    updateStatus(id, status) {
        const record = this.mandates.get(id);
        if (!record)
            return undefined;
        record.status = status;
        record.updatedAt = new Date().toISOString();
        return record;
    }
    listByPrincipal(principalId) {
        return Array.from(this.mandates.values()).filter((r) => r.principalId === principalId);
    }
    listAll() {
        return Array.from(this.mandates.values());
    }
}
//# sourceMappingURL=ap2-mandate-store.js.map