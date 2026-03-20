/**
 * In-memory store for user profiles and session contexts.
 * Provides multi-tenant isolation by keying on callerId.
 */
export class InMemoryUserContextStore {
    profiles = new Map();
    sessions = new Map();
    sessionKey(callerId, sessionId) {
        return `${callerId}:${sessionId}`;
    }
    async getProfile(callerId) {
        return this.profiles.get(callerId) ?? null;
    }
    async upsertProfile(profile) {
        this.profiles.set(profile.callerId, profile);
    }
    async deleteProfile(callerId) {
        this.profiles.delete(callerId);
    }
    async getSession(callerId, sessionId) {
        return this.sessions.get(this.sessionKey(callerId, sessionId)) ?? null;
    }
    async upsertSession(context) {
        this.sessions.set(this.sessionKey(context.callerId, context.sessionId), context);
    }
    async deleteAllForCaller(callerId) {
        this.profiles.delete(callerId);
        for (const [key] of this.sessions) {
            if (key.startsWith(`${callerId}:`)) {
                this.sessions.delete(key);
            }
        }
    }
}
//# sourceMappingURL=store.js.map