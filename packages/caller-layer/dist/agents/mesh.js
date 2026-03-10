import { createLogger } from "@stem-agent/shared";
import { A2AClient } from "./a2a-client.js";
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
    agents = new Map();
    log;
    roundRobinIndex = 0;
    healthTimer = null;
    constructor(opts = {}) {
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
    register(agentId, endpoint, capabilities) {
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
    unregister(agentId) {
        const removed = this.agents.delete(agentId);
        if (removed)
            this.log.info({ agentId }, "agent unregistered");
        return removed;
    }
    // ---- Discovery ----------------------------------------------------------
    /** Look up a specific agent by ID. Returns `undefined` if not found. */
    discover(agentId) {
        return this.agents.get(agentId);
    }
    /** List all registered agents. */
    listAgents() {
        return [...this.agents.values()];
    }
    /** List only agents currently marked healthy. */
    listHealthy() {
        return [...this.agents.values()].filter((a) => a.healthy);
    }
    /** Find all agents that have the given capability (case-insensitive). */
    findByCapability(capability) {
        const lower = capability.toLowerCase();
        return [...this.agents.values()].filter((a) => a.capabilities?.some((c) => c.toLowerCase().includes(lower)));
    }
    // ---- Load balancing -----------------------------------------------------
    /**
     * Return the next healthy agent in round-robin order.
     * Returns `undefined` if no healthy agents are available.
     */
    nextHealthy() {
        const healthy = this.listHealthy();
        if (healthy.length === 0)
            return undefined;
        const entry = healthy[this.roundRobinIndex % healthy.length];
        this.roundRobinIndex = (this.roundRobinIndex + 1) % healthy.length;
        return entry;
    }
    // ---- Health checking ----------------------------------------------------
    /**
     * Health-check a single agent by fetching its Agent Card.
     * Updates `healthy` and `lastChecked` fields.
     */
    async healthCheck(agentId) {
        const entry = this.agents.get(agentId);
        if (!entry)
            return false;
        try {
            const client = new A2AClient({ endpoint: entry.endpoint });
            await client.discoverAgent();
            entry.healthy = true;
        }
        catch {
            entry.healthy = false;
            this.log.warn({ agentId }, "health check failed");
        }
        entry.lastChecked = Date.now();
        return entry.healthy;
    }
    /** Health-check all registered agents in parallel. */
    async healthCheckAll() {
        const results = {};
        await Promise.all([...this.agents.keys()].map(async (id) => {
            results[id] = await this.healthCheck(id);
        }));
        return results;
    }
    // ---- Cleanup ------------------------------------------------------------
    /** Stop periodic health checks and clear the registry. */
    shutdown() {
        if (this.healthTimer) {
            clearInterval(this.healthTimer);
            this.healthTimer = null;
        }
        this.agents.clear();
        this.log.info("agent registry shut down");
    }
}
//# sourceMappingURL=mesh.js.map