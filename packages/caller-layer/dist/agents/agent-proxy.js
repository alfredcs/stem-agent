import { createLogger } from "@stem-agent/shared";
import { A2AClient } from "./a2a-client.js";
// ---------------------------------------------------------------------------
// AgentProxy
// ---------------------------------------------------------------------------
/**
 * Lightweight wrapper around {@link A2AClient} that caches the remote agent's
 * card and exposes capability-based queries useful for collaboration patterns.
 */
export class AgentProxy {
    client;
    log;
    card = null;
    capabilities = [];
    constructor(opts) {
        this.client = new A2AClient(opts);
        this.log = opts.logger ?? createLogger("agent-proxy");
    }
    // ---- Discovery ----------------------------------------------------------
    /** Fetch and cache the remote agent's card. */
    async discover() {
        this.card = await this.client.discoverAgent();
        this.capabilities = this.card.skills.map((s) => s.name);
        this.log.info({ agentId: this.card.agentId, capabilities: this.capabilities }, "agent discovered");
        return this.card;
    }
    // ---- Task execution -----------------------------------------------------
    /** Send a task to the agent with an optional timeout (default 30 s). */
    async sendTask(content, metadata, timeoutMs = 30_000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await this.client.sendTask({ content, metadata });
        }
        finally {
            clearTimeout(timer);
        }
    }
    // ---- Capability queries -------------------------------------------------
    /** Check whether the agent advertises the given skill name (case-insensitive). */
    hasCapability(skillOrTag) {
        const lower = skillOrTag.toLowerCase();
        return this.capabilities.some((c) => c.toLowerCase().includes(lower));
    }
    /** Return cached capabilities (empty if {@link discover} has not been called). */
    getCapabilities() {
        return this.capabilities;
    }
    /** Return cached agent card, or `null` if not yet discovered. */
    getCard() {
        return this.card;
    }
}
//# sourceMappingURL=agent-proxy.js.map