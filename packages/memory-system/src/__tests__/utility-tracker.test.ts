import { describe, it, expect } from "vitest";
import { UtilityTracker } from "../utility-tracker.js";

describe("UtilityTracker", () => {
  it("updateUtility performs EMA update", () => {
    const tracker = new UtilityTracker({ eta: 0.1 });
    // u = 0.5 + 0.1 * (1.0 - 0.5) = 0.55
    expect(tracker.updateUtility(0.5, 1.0)).toBeCloseTo(0.55);
  });

  it("updateUtility converges toward reward over repeated updates", () => {
    const tracker = new UtilityTracker({ eta: 0.1 });
    let u = 0.5;
    for (let i = 0; i < 50; i++) {
      u = tracker.updateUtility(u, 1.0);
    }
    // After 50 updates toward 1.0, should be very close to 1.0
    expect(u).toBeGreaterThan(0.99);
  });

  it("updateUtility moves toward negative rewards", () => {
    const tracker = new UtilityTracker({ eta: 0.1 });
    const result = tracker.updateUtility(0.5, -0.5);
    // u = 0.5 + 0.1 * (-0.5 - 0.5) = 0.5 - 0.1 = 0.4
    expect(result).toBeCloseTo(0.4);
  });

  it("recordReward and getMeanReward track sliding window", () => {
    const tracker = new UtilityTracker({ rewardWindow: 3 });
    tracker.recordReward(1.0);
    tracker.recordReward(0.0);
    tracker.recordReward(-1.0);
    expect(tracker.getMeanReward()).toBeCloseTo(0);

    // Adding a 4th pushes out the first (1.0)
    tracker.recordReward(0.5);
    // Window: [0.0, -1.0, 0.5], mean = -0.5/3 ≈ -0.167
    expect(tracker.getMeanReward()).toBeCloseTo(-0.5 / 3);
  });

  it("getMeanReward returns 0 with empty history", () => {
    const tracker = new UtilityTracker();
    expect(tracker.getMeanReward()).toBe(0);
  });

  it("isSignificant detects outlier rewards", () => {
    const tracker = new UtilityTracker({ significanceThreshold: 0.3 });
    // Fill with moderate rewards
    for (let i = 0; i < 10; i++) tracker.recordReward(0.5);
    // Mean is 0.5, so |1.0 - 0.5| = 0.5 > 0.3 → significant
    expect(tracker.isSignificant(1.0)).toBe(true);
    // |0.5 - 0.5| = 0 < 0.3 → not significant
    expect(tracker.isSignificant(0.5)).toBe(false);
  });

  it("statusToReward maps statuses correctly", () => {
    expect(UtilityTracker.statusToReward("completed")).toBe(1.0);
    expect(UtilityTracker.statusToReward("failed")).toBe(-0.5);
    expect(UtilityTracker.statusToReward("in_progress")).toBe(0.0);
    expect(UtilityTracker.statusToReward("unknown")).toBe(0.0);
  });
});
