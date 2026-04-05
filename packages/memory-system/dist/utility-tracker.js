/**
 * Utility Tracker — EMA-based utility scoring for memories (ATLAS integration).
 *
 * Tracks per-memory utility via exponential moving average and detects
 * significant outcomes (outliers) for immediate experience distillation.
 */
const DEFAULT_CONFIG = {
    eta: 0.1,
    rewardWindow: 100,
    significanceThreshold: 0.3,
};
export class UtilityTracker {
    config;
    rewardHistory = [];
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /** EMA update: u ← u + η·(r - u). */
    updateUtility(current, reward) {
        return current + this.config.eta * (reward - current);
    }
    /** Record a reward into the sliding window. */
    recordReward(reward) {
        this.rewardHistory.push(reward);
        if (this.rewardHistory.length > this.config.rewardWindow) {
            this.rewardHistory.shift();
        }
    }
    /** Running mean of recent rewards. */
    getMeanReward() {
        if (this.rewardHistory.length === 0)
            return 0;
        const sum = this.rewardHistory.reduce((a, b) => a + b, 0);
        return sum / this.rewardHistory.length;
    }
    /** True if |reward - meanReward| > significanceThreshold. */
    isSignificant(reward) {
        return Math.abs(reward - this.getMeanReward()) > this.config.significanceThreshold;
    }
    /** Map agent response status to a numeric reward. */
    static statusToReward(status) {
        switch (status) {
            case "completed": return 1.0;
            case "failed": return -0.5;
            case "in_progress": return 0.0;
            default: return 0.0;
        }
    }
}
//# sourceMappingURL=utility-tracker.js.map