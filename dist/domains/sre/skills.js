/**
 * Register SRE-domain plugin skills.
 * Called during agent initialization to inject domain-specific workflows.
 */
export async function registerDomainSkills(skillManager) {
    await skillManager.registerPlugin({
        name: "incident_triage",
        description: "Triage a production incident: gather signals, assess severity, determine root cause",
        trigger: {
            intentPatterns: ["incident", "triage", "outage", "alert", "page", "down"],
            domains: ["sre", "infrastructure", "incidents"],
        },
        toolChain: [
            { toolName: "list_alerts", argumentTemplate: { status: "firing", limit: 20 } },
            { toolName: "get_metrics", argumentTemplate: { query: "{service}_error_rate[5m]" } },
            { toolName: "query_logs", argumentTemplate: { service: "{service}", level: "error", limit: 100 } },
        ],
        maturity: "committed",
        successRate: 0.85,
        activationCount: 12,
        tags: ["sre", "incident", "triage"],
    });
    await skillManager.registerPlugin({
        name: "service_health_check",
        description: "Check health of a service: pods, metrics, recent deploys, error rates",
        trigger: {
            intentPatterns: ["health", "check", "status", "service"],
            domains: ["sre", "kubernetes", "monitoring"],
        },
        toolChain: [
            { toolName: "describe_pod", argumentTemplate: { service: "{service}" } },
            { toolName: "get_metrics", argumentTemplate: { query: "{service}_request_duration_seconds" } },
            { toolName: "list_alerts", argumentTemplate: { service: "{service}" } },
        ],
        maturity: "mature",
        successRate: 0.92,
        activationCount: 25,
        tags: ["sre", "health", "monitoring"],
    });
    await skillManager.registerPlugin({
        name: "safe_restart",
        description: "Safely restart a service with blast-radius checks and rollback readiness",
        trigger: {
            intentPatterns: ["restart", "bounce", "recycle"],
            domains: ["sre", "kubernetes"],
        },
        steps: [
            "Verify service identity and current replica count",
            "Check for active incidents on this service",
            "Assess blast radius (dependent services, traffic percentage)",
            "Execute rolling restart via kubernetes-mcp",
            "Monitor error rate for 2 minutes post-restart",
            "Report success or trigger rollback",
        ],
        maturity: "committed",
        successRate: 0.88,
        activationCount: 8,
        tags: ["sre", "restart", "kubernetes"],
    });
}
//# sourceMappingURL=skills.js.map