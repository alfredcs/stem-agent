import type pg from "pg";
import type { CallerProfile, CallerContext } from "@stem-agent/shared";
import type { IUserContextStore } from "../types.js";
export declare class PgUserContextStore implements IUserContextStore {
    private readonly pool;
    constructor(pool: pg.Pool);
    getProfile(callerId: string): Promise<CallerProfile | null>;
    upsertProfile(profile: CallerProfile): Promise<void>;
    deleteProfile(callerId: string): Promise<void>;
    getSession(callerId: string, sessionId: string): Promise<CallerContext | null>;
    upsertSession(context: CallerContext): Promise<void>;
    deleteAllForCaller(callerId: string): Promise<void>;
}
//# sourceMappingURL=pg-user-context-store.d.ts.map