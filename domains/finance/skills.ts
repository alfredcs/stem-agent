import type { SkillManager } from "@stem-agent/agent-core";

/**
 * Register finance-domain plugin skills.
 * Called during agent initialization to inject domain-specific workflows.
 */
export async function registerDomainSkills(skillManager: SkillManager): Promise<void> {
  await skillManager.registerPlugin({
    name: "market_analysis",
    description: "Fetch market data and produce a structured analysis report with risk indicators",
    trigger: {
      intentPatterns: ["market", "analyze", "stock", "ticker", "price"],
      domains: ["finance", "trading", "market"],
      entityTypes: ["number"],
    },
    toolChain: [
      { toolName: "market_data_query", argumentTemplate: { query: "{query}" } },
      { toolName: "risk_assessment", argumentTemplate: { data: "{market_data}" } },
      { toolName: "report_generate", argumentTemplate: { analysis: "{risk_result}", format: "markdown" } },
    ],
    maturity: "committed",
    successRate: 0.8,
    activationCount: 5,
    tags: ["finance", "analysis", "market"],
  });

  await skillManager.registerPlugin({
    name: "compliance_check",
    description: "Validate a proposed action against regulatory compliance rules",
    trigger: {
      intentPatterns: ["compliance", "regulation", "legal", "allowed", "permitted"],
      domains: ["finance", "compliance"],
    },
    toolChain: [
      { toolName: "compliance_check", argumentTemplate: { action: "{action}", jurisdiction: "{jurisdiction}" } },
    ],
    maturity: "committed",
    successRate: 0.9,
    activationCount: 10,
    tags: ["finance", "compliance", "regulatory"],
  });

  await skillManager.registerPlugin({
    name: "portfolio_risk_report",
    description: "Analyze portfolio risk exposure and generate a risk-adjusted performance report",
    trigger: {
      intentPatterns: ["portfolio", "risk", "exposure", "performance"],
      domains: ["finance", "portfolio", "risk"],
    },
    steps: [
      "Retrieve current portfolio positions from market data",
      "Calculate individual position risk metrics (VaR, beta, Sharpe)",
      "Compute aggregate portfolio risk exposure",
      "Compare against risk tolerance thresholds",
      "Generate risk-adjusted performance summary",
    ],
    maturity: "committed",
    successRate: 0.85,
    activationCount: 7,
    tags: ["finance", "portfolio", "risk"],
  });
}
