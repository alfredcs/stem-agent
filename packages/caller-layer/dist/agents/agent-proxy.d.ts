import type { AgentResponse } from "@stem-agent/shared";
import { type A2AClientOptions, type A2AAgentCard } from "./a2a-client.js";
/**
 * Lightweight wrapper around {@link A2AClient} that caches the remote agent's
 * card and exposes capability-based queries useful for collaboration patterns.
 */
export declare class AgentProxy {
    private readonly client;
    private readonly log;
    private card;
    private capabilities;
    constructor(opts: A2AClientOptions);
    /** Fetch and cache the remote agent's card. */
    discover(): Promise<A2AAgentCard>;
    /** Send a task to the agent with an optional timeout (default 30 s). */
    sendTask(content: string, metadata?: Record<string, unknown>, timeoutMs?: number): Promise<AgentResponse>;
    /** Check whether the agent advertises the given skill name (case-insensitive). */
    hasCapability(skillOrTag: string): boolean;
    /** Return cached capabilities (empty if {@link discover} has not been called). */
    getCapabilities(): string[];
    /** Return cached agent card, or `null` if not yet discovered. */
    getCard(): A2AAgentCard | null;
}
//# sourceMappingURL=agent-proxy.d.ts.map