import type { SkillManager } from "@stem-agent/agent-core";

export async function registerDomainSkills(skillManager: SkillManager): Promise<void> {
  // Add domain-specific plugin skills here. Each skill is a trigger + toolChain
  // or a trigger + step list. See domains/finance/skills.ts for reference.
  void skillManager;
}
