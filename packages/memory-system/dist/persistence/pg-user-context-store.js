"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgUserContextStore = void 0;
class PgUserContextStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async getProfile(callerId) {
        const { rows } = await this.pool.query("SELECT profile FROM caller_profiles WHERE caller_id = $1", [callerId]);
        if (rows.length === 0)
            return null;
        return rows[0].profile;
    }
    async upsertProfile(profile) {
        const now = Date.now();
        await this.pool.query(`INSERT INTO caller_profiles (caller_id, profile, created_at, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (caller_id) DO UPDATE SET
         profile = EXCLUDED.profile,
         updated_at = EXCLUDED.updated_at`, [profile.callerId, JSON.stringify(profile), now, now]);
    }
    async deleteProfile(callerId) {
        await this.pool.query("DELETE FROM caller_profiles WHERE caller_id = $1", [callerId]);
    }
    async getSession(callerId, sessionId) {
        const { rows } = await this.pool.query("SELECT context FROM caller_sessions WHERE caller_id = $1 AND session_id = $2", [callerId, sessionId]);
        if (rows.length === 0)
            return null;
        return rows[0].context;
    }
    async upsertSession(context) {
        await this.pool.query(`INSERT INTO caller_sessions (caller_id, session_id, context)
       VALUES ($1, $2, $3)
       ON CONFLICT (caller_id, session_id) DO UPDATE SET
         context = EXCLUDED.context`, [context.callerId, context.sessionId, JSON.stringify(context)]);
    }
    async deleteAllForCaller(callerId) {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM caller_sessions WHERE caller_id = $1", [callerId]);
            await client.query("DELETE FROM caller_profiles WHERE caller_id = $1", [callerId]);
            await client.query("COMMIT");
        }
        catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
        finally {
            client.release();
        }
    }
}
exports.PgUserContextStore = PgUserContextStore;
//# sourceMappingURL=pg-user-context-store.js.map