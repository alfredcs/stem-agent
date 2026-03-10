import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UserContextManager } from "../user-context/user-context-manager.js";
import { InMemoryUserContextStore } from "../user-context/store.js";
import type { CallerProfile, CallerContext } from "@stem-agent/shared";

describe("InMemoryUserContextStore", () => {
  let store: InMemoryUserContextStore;

  beforeEach(() => {
    store = new InMemoryUserContextStore();
  });

  it("getProfile returns null for unknown caller", async () => {
    expect(await store.getProfile("unknown")).toBeNull();
  });

  it("upsertProfile stores and retrieves a profile", async () => {
    const profile = {
      callerId: "user-1",
      philosophy: {
        pragmatismVsIdealism: 0.5,
        simplicityVsCompleteness: 0.5,
        depthVsBreadth: 0.5,
        riskTolerance: 0.5,
        innovationOrientation: 0.5,
      },
      style: {
        formality: 0.5,
        verbosity: 0.5,
        technicalDepth: 0.5,
        examplesPreference: 0.5,
        preferredOutputFormat: "markdown",
      },
      habits: {
        typicalSessionLength: 30,
        iterationTendency: 0.5,
        questionAsking: 0.5,
        contextProviding: 0.5,
        peakHours: [],
        commonTopics: [],
      },
      principles: {
        communicationStyle: "balanced",
        detailLevel: "standard" as const,
        preferredResponseFormat: "markdown",
        domainExpertise: {},
        interactionGoals: [],
      },
      confidence: 0,
      totalInteractions: 0,
      satisfactionScores: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } satisfies CallerProfile;

    await store.upsertProfile(profile);
    const result = await store.getProfile("user-1");
    expect(result).not.toBeNull();
    expect(result!.callerId).toBe("user-1");
  });

  it("deleteProfile removes a profile", async () => {
    const profile = { callerId: "user-1" } as CallerProfile;
    await store.upsertProfile(profile);
    await store.deleteProfile("user-1");
    expect(await store.getProfile("user-1")).toBeNull();
  });

  it("getSession returns null for unknown session", async () => {
    expect(await store.getSession("user-1", "sess-1")).toBeNull();
  });

  it("upsertSession stores and retrieves a session", async () => {
    const ctx: CallerContext = {
      callerId: "user-1",
      sessionId: "sess-1",
      currentGoals: [],
      activeTasks: [],
      permissions: [],
      role: "user",
    };
    await store.upsertSession(ctx);
    const result = await store.getSession("user-1", "sess-1");
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe("sess-1");
  });

  it("deleteAllForCaller removes profile and all sessions", async () => {
    const profile = { callerId: "user-1" } as CallerProfile;
    await store.upsertProfile(profile);

    const ctx1: CallerContext = {
      callerId: "user-1",
      sessionId: "s1",
      currentGoals: [],
      activeTasks: [],
      permissions: [],
      role: "user",
    };
    const ctx2: CallerContext = {
      callerId: "user-1",
      sessionId: "s2",
      currentGoals: [],
      activeTasks: [],
      permissions: [],
      role: "user",
    };
    await store.upsertSession(ctx1);
    await store.upsertSession(ctx2);

    await store.deleteAllForCaller("user-1");
    expect(await store.getProfile("user-1")).toBeNull();
    expect(await store.getSession("user-1", "s1")).toBeNull();
    expect(await store.getSession("user-1", "s2")).toBeNull();
  });

  it("deleteAllForCaller does not affect other callers", async () => {
    const p1 = { callerId: "user-1" } as CallerProfile;
    const p2 = { callerId: "user-2" } as CallerProfile;
    await store.upsertProfile(p1);
    await store.upsertProfile(p2);

    await store.deleteAllForCaller("user-1");
    expect(await store.getProfile("user-2")).not.toBeNull();
  });
});

describe("UserContextManager", () => {
  let manager: UserContextManager;
  let store: InMemoryUserContextStore;

  beforeEach(() => {
    store = new InMemoryUserContextStore();
    manager = new UserContextManager(store, { profileLearningRate: 0.1 });
  });

  it("getProfile creates a default profile for new caller", async () => {
    const profile = await manager.getProfile("new-user");
    expect(profile.callerId).toBe("new-user");
    expect(profile.totalInteractions).toBe(0);
    expect(profile.philosophy.pragmatismVsIdealism).toBe(0.5);
  });

  it("getProfile returns existing profile", async () => {
    const first = await manager.getProfile("user-1");
    first.totalInteractions = 5;
    await store.upsertProfile(first);

    const second = await manager.getProfile("user-1");
    expect(second.totalInteractions).toBe(5);
  });

  it("updateProfile increments totalInteractions", async () => {
    await manager.updateProfile("user-1", {});
    const profile = await manager.getProfile("user-1");
    expect(profile.totalInteractions).toBe(1);
  });

  it("updateProfile applies EMA to philosophy dimensions", async () => {
    await manager.getProfile("user-1"); // create default
    await manager.updateProfile("user-1", { riskTolerance: 1.0 });

    const profile = await manager.getProfile("user-1");
    // EMA: 0.5 * 0.9 + 1.0 * 0.1 = 0.55
    expect(profile.philosophy.riskTolerance).toBeCloseTo(0.55);
  });

  it("updateProfile applies EMA to style dimensions", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { formality: 1.0 });

    const profile = await manager.getProfile("user-1");
    expect(profile.style.formality).toBeCloseTo(0.55);
  });

  it("updateProfile updates preferredOutputFormat", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { preferredOutputFormat: "json" });

    const profile = await manager.getProfile("user-1");
    expect(profile.style.preferredOutputFormat).toBe("json");
  });

  it("updateProfile tracks new topics", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { topic: "machine-learning" });

    const profile = await manager.getProfile("user-1");
    expect(profile.habits.commonTopics).toContain("machine-learning");
  });

  it("updateProfile does not duplicate existing topics", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { topic: "ml" });
    await manager.updateProfile("user-1", { topic: "ml" });

    const profile = await manager.getProfile("user-1");
    expect(profile.habits.commonTopics.filter((t) => t === "ml")).toHaveLength(1);
  });

  it("updateProfile tracks satisfaction scores", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { satisfaction: 0.9 });
    await manager.updateProfile("user-1", { satisfaction: 0.7 });

    const profile = await manager.getProfile("user-1");
    expect(profile.satisfactionScores).toEqual([0.9, 0.7]);
  });

  it("updateProfile applies EMA to typicalSessionLength", async () => {
    await manager.getProfile("user-1");
    await manager.updateProfile("user-1", { typicalSessionLength: 60 });

    const profile = await manager.getProfile("user-1");
    // EMA: 30 * 0.9 + 60 * 0.1 = 33
    expect(profile.habits.typicalSessionLength).toBeCloseTo(33);
  });

  it("getContext creates a new session context", async () => {
    const ctx = await manager.getContext("user-1", "session-1");
    expect(ctx.callerId).toBe("user-1");
    expect(ctx.sessionId).toBe("session-1");
    expect(ctx.role).toBe("user");
  });

  it("getContext returns existing session", async () => {
    const first = await manager.getContext("user-1", "session-1");
    first.currentGoals = ["goal-1"];
    await manager.updateSession(first);

    const second = await manager.getContext("user-1", "session-1");
    expect(second.currentGoals).toEqual(["goal-1"]);
  });

  it("forget removes all caller data", async () => {
    await manager.getProfile("user-1");
    await manager.getContext("user-1", "s1");
    await manager.getContext("user-1", "s2");

    await manager.forget("user-1");

    // getProfile will create a fresh default
    const profile = await manager.getProfile("user-1");
    expect(profile.totalInteractions).toBe(0);
  });
});
