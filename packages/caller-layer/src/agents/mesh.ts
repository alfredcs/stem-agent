import { createLogger, type Logger } from "@stem-agent/shared";
import { A2AClient } from "./a2a-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Registered agent entry. */
export interface AgentEntry {
  agentId: string;
  endpoint: string;
  healthy: boolean;
  lastChecked: number;
  capabilities?: string[];
}

/** Options for {@link AgentRegistry}. */
export interface AgentRegistryOptions {
  /** Health-check interval in ms. 0 disables periodic checks. */
  healthCheckIntervalMs?: number;
  /** Injected logger. */
  logger?: Logger;
}

// ---------------------------------------------------------------------------
// AgentRegistry
// ---------------------------------------------------------------------------

/**
 * In-memory registry of remote agents with health-checking and
 * round-robin load balancing.
 *
 * @example
 * ```ts
 * const mesh = new AgentRegistry();
 * mesh.register("agent-1", "http://agent1:8000");
 * mesh.register("agent-2", "http://agent2:8000");
 * const next = mesh.nextHealthy(); // round-robin
 * ```
 */
export class AgentRegistry {
  private readonly agents = new Map<string, AgentEntry>();
  private readonly log: Logger;
  private roundRobinIndex = 0;
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: AgentRegistryOptions = {}) {
    this.log = opts.logger ?? createLogger("agent-mesh");

    const interval = opts.healthCheckIntervalMs ?? 0;
    if (interval > 0) {
      this.healthTimer = setInterval(() => {
        void this.healthCheckAll();
      }, interval);
      // Allow the process to exit even if the timer is still active
      if (this.healthTimer && typeof this.healthTimer === "object" && "unref" in this.healthTimer) {
        this.healthTimer.unref();
      }
    }
  }

  // ---- Registration -------------------------------------------------------

  /** Register an agent endpoint with optional capabilities. */
  register(agentId: string, endpoint: string, capabilities?: string[]): void {
    this.agents.set(agentId, {
      agentId,
      endpoint: endpoint.replace(/\/+$/, ""),
      healthy: true,
      lastChecked: 0,
      capabilities,
    });
    this.log.info({ agentId, endpoint }, "agent registered");
  }

  /** Remove an agent from the registry. */
  unregister(agentId: string): boolean {
    const removed = this.agents.delete(agentId);
    if (removed) this.log.info({ agentId }, "agent unregistered");
    return removed;
  }

  // ---- Discovery ----------------------------------------------------------

  /** Look up a specific agent by ID. Returns `undefined` if not found. */
  discover(agentId: string): AgentEntry | undefined {
    return this.agents.get(agentId);
  }

  /** List all registered agents. */
  listAgents(): AgentEntry[] {
    return [...this.agents.values()];
  }

  /** List only agents currently marked healthy. */
  listHealthy(): AgentEntry[] {
    return [...this.agents.values()].filter((a) => a.healthy);
  }

  /** Find all agents that have the given capability (case-insensitive). */
  findByCapability(capability: string): AgentEntry[] {
    const lower = capability.toLowerCase();
    return [...this.agents.values()].filter((a) =>
      a.capabilities?.some((c) => c.toLowerCase().includes(lower)),
    );
  }

  // ---- Load balancing -----------------------------------------------------

  /**
   * Return the next healthy agent in round-robin order.
   * Returns `undefined` if no healthy agents are available.
   */
  nextHealthy(): AgentEntry | undefined {
    const healthy = this.listHealthy();
    if (healthy.length === 0) return undefined;

    const entry = healthy[this.roundRobinIndex % healthy.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % healthy.length;
    return entry;
  }

  // ---- Health checking ----------------------------------------------------

  /**
   * Health-check a single agent by fetching its Agent Card.
   * Updates `healthy` and `lastChecked` fields.
   */
  async healthCheck(agentId: string): Promise<boolean> {
    const entry = this.agents.get(agentId);
    if (!entry) return false;

    try {
      const client = new A2AClient({ endpoint: entry.endpoint });
      await client.discoverAgent();
      entry.healthy = true;
    } catch {
      entry.healthy = false;
      this.log.warn({ agentId }, "health check failed");
    }

    entry.lastChecked = Date.now();
    return entry.healthy;
  }

  /** Health-check all registered agents in parallel. */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      [...this.agents.keys()].map(async (id) => {
        results[id] = await this.healthCheck(id);
      }),
    );

    return results;
  }

  // ---- Cleanup ------------------------------------------------------------

  /** Stop periodic health checks and clear the registry. */
  shutdown(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.agents.clear();
    this.log.info("agent registry shut down");
  }
}
