/**
 * Utility Tracker — EMA-based utility scoring for memories (ATLAS integration).
 *
 * Tracks per-memory utility via exponential moving average and detects
 * significant outcomes (outliers) for immediate experience distillation.
 */
export interface UtilityTrackerConfig {
    /** EMA learning rate (default 0.1). */
    eta: number;
    /** Sliding window size for running mean reward (default 100). */
    rewardWindow: number;
    /** Threshold for significance detection: |reward - mean| > tau (default 0.3). */
    significanceThreshold: number;
}
export declare class UtilityTracker {
    private readonly config;
    private readonly rewardHistory;
    constructor(config?: Partial<UtilityTrackerConfig>);
    /** EMA update: u ← u + η·(r - u). */
    updateUtility(current: number, reward: number): number;
    /** Record a reward into the sliding window. */
    recordReward(reward: number): void;
    /** Running mean of recent rewards. */
    getMeanReward(): number;
    /** True if |reward - meanReward| > significanceThreshold. */
    isSignificant(reward: number): boolean;
    /** Map agent response status to a numeric reward. */
    static statusToReward(status: string): number;
}
//# sourceMappingURL=utility-tracker.d.ts.map