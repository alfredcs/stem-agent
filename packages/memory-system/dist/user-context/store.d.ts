import type { CallerProfile, CallerContext } from "@stem-agent/shared";
import type { IUserContextStore } from "../types.js";
/**
 * In-memory store for user profiles and session contexts.
 * Provides multi-tenant isolation by keying on callerId.
 */
export declare class InMemoryUserContextStore implements IUserContextStore {
    private readonly profiles;
    private readonly sessions;
    private sessionKey;
    getProfile(callerId: string): Promise<CallerProfile | null>;
    upsertProfile(profile: CallerProfile): Promise<void>;
    deleteProfile(callerId: string): Promise<void>;
    getSession(callerId: string, sessionId: string): Promise<CallerContext | null>;
    upsertSession(context: CallerContext): Promise<void>;
    deleteAllForCaller(callerId: string): Promise<void>;
}
//# sourceMappingURL=store.d.ts.map