import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AgentRegistry } from "../agents/mesh.js";

// ---------------------------------------------------------------------------
// Mock fetch (used by A2AClient inside healthCheck)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as unknown as Response;
}

const fakeCard = {
  agentId: "a1",
  name: "Agent",
  description: "Test",
  version: "1",
  endpoint: "http://agent:8000",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    mockFetch.mockReset();
    registry = new AgentRegistry();
  });

  afterEach(() => {
    registry.shutdown();
  });

  // ---- register / unregister ----------------------------------------------

  it("register() and listAgents()", () => {
    registry.register("a1", "http://a1:8000");
    registry.register("a2", "http://a2:8000");

    const agents = registry.listAgents();
    expect(agents).toHaveLength(2);
    expect(agents.map((a) => a.agentId).sort()).toEqual(["a1", "a2"]);
  });

  it("unregister() removes agent", () => {
    registry.register("a1", "http://a1:8000");
    expect(registry.unregister("a1")).toBe(true);
    expect(registry.listAgents()).toHaveLength(0);
  });

  it("unregister() returns false for unknown agent", () => {
    expect(registry.unregister("unknown")).toBe(false);
  });

  // ---- discover -----------------------------------------------------------

  it("discover() returns entry or undefined", () => {
    registry.register("a1", "http://a1:8000");
    expect(registry.discover("a1")?.agentId).toBe("a1");
    expect(registry.discover("nope")).toBeUndefined();
  });

  // ---- load balancing -----------------------------------------------------

  it("nextHealthy() returns agents in round-robin", () => {
    registry.register("a1", "http://a1:8000");
    registry.register("a2", "http://a2:8000");

    const first = registry.nextHealthy();
    const second = registry.nextHealthy();

    expect(first?.agentId).not.toBe(second?.agentId);
  });

  it("nextHealthy() returns undefined when no agents", () => {
    expect(registry.nextHealthy()).toBeUndefined();
  });

  it("nextHealthy() skips unhealthy agents", () => {
    registry.register("a1", "http://a1:8000");
    registry.register("a2", "http://a2:8000");

    // Mark a1 unhealthy manually
    const entry = registry.discover("a1")!;
    entry.healthy = false;

    const selected = registry.nextHealthy();
    expect(selected?.agentId).toBe("a2");
  });

  // ---- health check -------------------------------------------------------

  it("healthCheck() marks agent healthy on success", async () => {
    registry.register("a1", "http://a1:8000");
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeCard));

    const result = await registry.healthCheck("a1");
    expect(result).toBe(true);
    expect(registry.discover("a1")?.healthy).toBe(true);
    expect(registry.discover("a1")?.lastChecked).toBeGreaterThan(0);
  });

  it("healthCheck() marks agent unhealthy on failure", async () => {
    registry.register("a1", "http://a1:8000");
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await registry.healthCheck("a1");
    expect(result).toBe(false);
    expect(registry.discover("a1")?.healthy).toBe(false);
  });

  it("healthCheck() returns false for unknown agent", async () => {
    const result = await registry.healthCheck("unknown");
    expect(result).toBe(false);
  });

  it("healthCheckAll() checks all agents", async () => {
    registry.register("a1", "http://a1:8000");
    registry.register("a2", "http://a2:8000");

    mockFetch
      .mockResolvedValueOnce(jsonResponse(fakeCard))
      .mockRejectedValueOnce(new Error("down"));

    const results = await registry.healthCheckAll();
    // One passes, one fails — exact mapping depends on Promise.all order
    const values = Object.values(results);
    expect(values).toContain(true);
    expect(values).toContain(false);
  });

  // ---- shutdown -----------------------------------------------------------

  it("shutdown() clears registry", () => {
    registry.register("a1", "http://a1:8000");
    registry.shutdown();
    expect(registry.listAgents()).toHaveLength(0);
  });

  // ---- periodic health check timer ---------------------------------------

  it("respects healthCheckIntervalMs option", () => {
    const r = new AgentRegistry({ healthCheckIntervalMs: 60000 });
    // Just verify it doesn't throw; timer is unref'd so process can exit
    r.shutdown();
  });
});
