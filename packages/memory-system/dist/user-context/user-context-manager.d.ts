import type { CallerProfile, CallerContext } from "@stem-agent/shared";
import type { IUserContextStore } from "../types.js";
import type { Logger } from "@stem-agent/shared";
import type { MemorySystemConfig } from "../types.js";
/**
 * User context manager — per-user profiles, session context, and privacy controls.
 *
 * Manages caller profiles (preferences, communication style, expertise),
 * per-session caller context, context building with token budgets,
 * and privacy controls (retention policies, forget-me).
 */
export declare class UserContextManager {
    private readonly store;
    private readonly log;
    private readonly learningRate;
    private readonly locks;
    constructor(store: IUserContextStore, config?: Partial<MemorySystemConfig>, logger?: Logger);
    private withCallerLock;
    /** Get or create a caller profile. Creates default profile if not found. */
    getProfile(callerId: string): Promise<CallerProfile>;
    /**
     * Update a caller profile from interaction data using exponential moving average.
     * Interaction keys matching profile dimension names are used for updates.
     */
    updateProfile(callerId: string, interaction: Record<string, unknown>): Promise<void>;
    /** Get or create a session context. */
    getContext(callerId: string, sessionId: string): Promise<CallerContext>;
    /** Update session context. */
    updateSession(context: CallerContext): Promise<void>;
    /**
     * Delete all data for a caller (GDPR forget-me).
     * Removes profile and all session data.
     */
    forget(callerId: string): Promise<void>;
}
//# sourceMappingURL=user-context-manager.d.ts.map