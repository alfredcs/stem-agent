import { CallerProfileSchema, CallerContextSchema } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
/**
 * User context manager — per-user profiles, session context, and privacy controls.
 *
 * Manages caller profiles (preferences, communication style, expertise),
 * per-session caller context, context building with token budgets,
 * and privacy controls (retention policies, forget-me).
 */
export class UserContextManager {
    store;
    log;
    learningRate;
    locks = new Map();
    constructor(store, config, logger) {
        this.store = store;
        this.learningRate = config?.profileLearningRate ?? 0.1;
        this.log = logger ?? createLogger("user-context");
    }
    async withCallerLock(callerId, fn) {
        const existing = this.locks.get(callerId) ?? Promise.resolve();
        const next = existing.then(fn, fn);
        this.locks.set(callerId, next);
        try {
            await next;
        }
        finally {
            if (this.locks.get(callerId) === next) {
                this.locks.delete(callerId);
            }
        }
    }
    /** Get or create a caller profile. Creates default profile if not found. */
    async getProfile(callerId) {
        const existing = await this.store.getProfile(callerId);
        if (existing)
            return existing;
        const profile = CallerProfileSchema.parse({
            callerId,
            philosophy: {},
            style: {},
            habits: {},
        });
        await this.store.upsertProfile(profile);
        this.log.debug({ callerId }, "default caller profile created");
        return profile;
    }
    /**
     * Update a caller profile from interaction data using exponential moving average.
     * Interaction keys matching profile dimension names are used for updates.
     */
    async updateProfile(callerId, interaction) {
        await this.withCallerLock(callerId, async () => {
            const profile = await this.getProfile(callerId);
            const alpha = this.learningRate;
            // Update philosophy dimensions
            const philosophyKeys = [
                "pragmatismVsIdealism",
                "simplicityVsCompleteness",
                "depthVsBreadth",
                "riskTolerance",
                "innovationOrientation",
            ];
            for (const key of philosophyKeys) {
                const signal = interaction[key];
                if (typeof signal === "number") {
                    profile.philosophy[key] =
                        profile.philosophy[key] * (1 - alpha) + signal * alpha;
                }
            }
            // Update style dimensions
            const styleKeys = [
                "formality",
                "verbosity",
                "technicalDepth",
                "examplesPreference",
            ];
            for (const key of styleKeys) {
                const signal = interaction[key];
                if (typeof signal === "number") {
                    profile.style[key] =
                        profile.style[key] * (1 - alpha) + signal * alpha;
                }
            }
            if (typeof interaction["preferredOutputFormat"] === "string") {
                profile.style.preferredOutputFormat =
                    interaction["preferredOutputFormat"];
            }
            // Update habits
            if (typeof interaction["typicalSessionLength"] === "number") {
                profile.habits.typicalSessionLength =
                    profile.habits.typicalSessionLength * (1 - alpha) +
                        interaction["typicalSessionLength"] * alpha;
            }
            // Track topics
            const topic = interaction["topic"];
            if (typeof topic === "string" && !profile.habits.commonTopics.includes(topic)) {
                profile.habits.commonTopics.push(topic);
            }
            profile.totalInteractions += 1;
            profile.confidence = 1 - 1 / (1 + profile.totalInteractions / 10);
            profile.updatedAt = Date.now();
            // Track satisfaction if provided
            const satisfaction = interaction["satisfaction"];
            if (typeof satisfaction === "number") {
                profile.satisfactionScores.push(satisfaction);
            }
            await this.store.upsertProfile(profile);
            this.log.debug({ callerId, interactions: profile.totalInteractions }, "profile updated");
        });
    }
    /** Get or create a session context. */
    async getContext(callerId, sessionId) {
        const existing = await this.store.getSession(callerId, sessionId);
        if (existing)
            return existing;
        const profile = await this.getProfile(callerId);
        const context = CallerContextSchema.parse({
            callerId,
            sessionId,
            profile,
        });
        await this.store.upsertSession(context);
        return context;
    }
    /** Update session context. */
    async updateSession(context) {
        await this.store.upsertSession(context);
    }
    /**
     * Delete all data for a caller (GDPR forget-me).
     * Removes profile and all session data.
     */
    async forget(callerId) {
        await this.store.deleteAllForCaller(callerId);
        this.log.info({ callerId }, "caller data deleted (forget-me)");
    }
}
//# sourceMappingURL=user-context-manager.js.map