import { type Logger } from "@stem-agent/shared";
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
export declare class AgentRegistry {
    private readonly agents;
    private readonly log;
    private roundRobinIndex;
    private healthTimer;
    constructor(opts?: AgentRegistryOptions);
    /** Register an agent endpoint with optional capabilities. */
    register(agentId: string, endpoint: string, capabilities?: string[]): void;
    /** Remove an agent from the registry. */
    unregister(agentId: string): boolean;
    /** Look up a specific agent by ID. Returns `undefined` if not found. */
    discover(agentId: string): AgentEntry | undefined;
    /** List all registered agents. */
    listAgents(): AgentEntry[];
    /** List only agents currently marked healthy. */
    listHealthy(): AgentEntry[];
    /** Find all agents that have the given capability (case-insensitive). */
    findByCapability(capability: string): AgentEntry[];
    /**
     * Return the next healthy agent in round-robin order.
     * Returns `undefined` if no healthy agents are available.
     */
    nextHealthy(): AgentEntry | undefined;
    /**
     * Health-check a single agent by fetching its Agent Card.
     * Updates `healthy` and `lastChecked` fields.
     */
    healthCheck(agentId: string): Promise<boolean>;
    /** Health-check all registered agents in parallel. */
    healthCheckAll(): Promise<Record<string, boolean>>;
    /** Stop periodic health checks and clear the registry. */
    shutdown(): void;
}
//# sourceMappingURL=mesh.d.ts.map