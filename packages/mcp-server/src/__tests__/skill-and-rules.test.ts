import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");

// ---------------------------------------------------------------------------
// Skill SKILL.md — Structure Validation
// ---------------------------------------------------------------------------

describe("Skill: differentiate-agent", () => {
  const skillDir = resolve(ROOT, ".claude/skills/differentiate-agent");
  const skillFile = resolve(skillDir, "SKILL.md");

  it("skill directory exists", () => {
    expect(existsSync(skillDir)).toBe(true);
  });

  it("SKILL.md file exists", () => {
    expect(existsSync(skillFile)).toBe(true);
  });

  it("SKILL.md has valid frontmatter with name and description", () => {
    const content = readFileSync(skillFile, "utf-8");
    // Check frontmatter delimiters
    expect(content.startsWith("---")).toBe(true);
    const frontmatterEnd = content.indexOf("---", 3);
    expect(frontmatterEnd).toBeGreaterThan(3);

    const frontmatter = content.slice(3, frontmatterEnd).trim();
    expect(frontmatter).toContain("name:");
    expect(frontmatter).toContain("description:");
  });

  it("SKILL.md name is 'differentiate-agent'", () => {
    const content = readFileSync(skillFile, "utf-8");
    const frontmatter = content.slice(3, content.indexOf("---", 3)).trim();
    const nameLine = frontmatter.split("\n").find((l) => l.startsWith("name:"));
    expect(nameLine).toBeDefined();
    expect(nameLine).toContain("differentiate-agent");
  });

  it("SKILL.md references $ARGUMENTS for domain name", () => {
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("$ARGUMENTS");
  });

  it("SKILL.md covers all differentiation steps", () => {
    const content = readFileSync(skillFile, "utf-8");
    // Must mention persona, environment, skills, rules, MCP config
    expect(content).toContain("persona.json");
    expect(content).toContain(".env");
    expect(content).toContain("skills");
    expect(content).toContain(".claude/rules/");
    expect(content).toContain("mcp.json");
  });

  it("SKILL.md references DomainPersona schema", () => {
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("domain-persona.ts");
  });

  it("SKILL.md mentions all reasoning strategies with use cases", () => {
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("react");
    expect(content).toContain("reflexion");
    expect(content).toContain("chain_of_thought");
    expect(content).toContain("internal_debate");
  });

  it("SKILL.md includes verification checklist", () => {
    const content = readFileSync(skillFile, "utf-8");
    // Should have verification steps (checkboxes or verification section)
    expect(content.toLowerCase()).toContain("verif");
  });

  it("SKILL.md references StemMCPServer for MCP entrypoint", () => {
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("StemMCPServer");
  });

  it("SKILL.md includes registerPlugin example for skill registration", () => {
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("registerPlugin");
    expect(content).toContain("SkillManager");
  });
});

// ---------------------------------------------------------------------------
// Domain Rules — .claude/rules/ Validation
// ---------------------------------------------------------------------------

describe("Domain Rules: .claude/rules/", () => {
  const rulesDir = resolve(ROOT, ".claude/rules");

  it("rules directory exists", () => {
    expect(existsSync(rulesDir)).toBe(true);
  });

  it("finance-domain.md exists", () => {
    expect(existsSync(resolve(rulesDir, "finance-domain.md"))).toBe(true);
  });

  it("sre-domain.md exists", () => {
    expect(existsSync(resolve(rulesDir, "sre-domain.md"))).toBe(true);
  });

  describe("finance-domain.md", () => {
    const content = readFileSync(resolve(ROOT, ".claude/rules/finance-domain.md"), "utf-8");

    it("has frontmatter with globs targeting domains/finance/", () => {
      expect(content.startsWith("---")).toBe(true);
      const frontmatter = content.slice(3, content.indexOf("---", 3)).trim();
      expect(frontmatter).toContain("globs:");
      expect(frontmatter).toContain("domains/finance");
    });

    it("mentions compliance requirements", () => {
      expect(content.toLowerCase()).toContain("compliance");
    });

    it("mentions financial domain conventions", () => {
      expect(content.toLowerCase()).toContain("decimal");
      expect(content.toLowerCase()).toContain("monetary");
    });

    it("mentions domain MCP servers", () => {
      expect(content).toContain("bloomberg");
    });

    it("includes testing guidance", () => {
      expect(content.toLowerCase()).toContain("test");
    });
  });

  describe("sre-domain.md", () => {
    const content = readFileSync(resolve(ROOT, ".claude/rules/sre-domain.md"), "utf-8");

    it("has frontmatter with globs targeting domains/sre/", () => {
      expect(content.startsWith("---")).toBe(true);
      const frontmatter = content.slice(3, content.indexOf("---", 3)).trim();
      expect(frontmatter).toContain("globs:");
      expect(frontmatter).toContain("domains/sre");
    });

    it("mentions blast radius", () => {
      expect(content.toLowerCase()).toContain("blast radius");
    });

    it("mentions runbooks", () => {
      expect(content.toLowerCase()).toContain("runbook");
    });

    it("mentions escalation", () => {
      expect(content.toLowerCase()).toContain("escalat");
    });

    it("mentions domain MCP servers", () => {
      expect(content).toContain("datadog");
      expect(content).toContain("pagerduty");
      expect(content).toContain("kubernetes");
    });

    it("includes testing guidance", () => {
      expect(content.toLowerCase()).toContain("test");
    });
  });
});

// ---------------------------------------------------------------------------
// Domain Skills — domains/*/skills.ts Validation
// ---------------------------------------------------------------------------

describe("Domain Skills Files", () => {
  it("domains/finance/skills.ts exists", () => {
    expect(existsSync(resolve(ROOT, "domains/finance/skills.ts"))).toBe(true);
  });

  it("domains/sre/skills.ts exists", () => {
    expect(existsSync(resolve(ROOT, "domains/sre/skills.ts"))).toBe(true);
  });

  describe("finance skills.ts", () => {
    const content = readFileSync(resolve(ROOT, "domains/finance/skills.ts"), "utf-8");

    it("exports registerDomainSkills function", () => {
      expect(content).toContain("export async function registerDomainSkills");
    });

    it("imports SkillManager type", () => {
      expect(content).toContain("SkillManager");
    });

    it("calls registerPlugin at least 2 times", () => {
      const matches = content.match(/registerPlugin/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });

    it("defines finance-domain skills with appropriate triggers", () => {
      expect(content).toContain("finance");
      expect(content).toContain("trigger");
      expect(content).toContain("intentPatterns");
    });

    it("sets maturity to committed for manual skills", () => {
      expect(content).toContain('"committed"');
    });
  });

  describe("sre skills.ts", () => {
    const content = readFileSync(resolve(ROOT, "domains/sre/skills.ts"), "utf-8");

    it("exports registerDomainSkills function", () => {
      expect(content).toContain("export async function registerDomainSkills");
    });

    it("calls registerPlugin at least 2 times", () => {
      const matches = content.match(/registerPlugin/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });

    it("defines SRE-domain skills with appropriate triggers", () => {
      expect(content).toContain("incident");
      expect(content).toContain("sre");
      expect(content).toContain("trigger");
    });

    it("includes blast-radius-aware restart skill", () => {
      expect(content).toContain("safe_restart");
      expect(content.toLowerCase()).toContain("blast");
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-Validation — File Reference Integrity
// ---------------------------------------------------------------------------

describe("File Reference Integrity", () => {
  it("all persona files referenced in .mcp.json exist on disk", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    for (const server of Object.values(config.mcpServers)) {
      const s = server as { env?: Record<string, string> };
      const path = s.env?.DOMAIN_PERSONA;
      if (path) {
        expect(existsSync(resolve(ROOT, path))).toBe(true);
      }
    }
  });

  it("each domain directory has both persona.json and skills.ts", () => {
    const domainsDir = resolve(ROOT, "domains");
    if (!existsSync(domainsDir)) return;
    const domains = readdirSync(domainsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const domain of domains) {
      const domainDir = resolve(domainsDir, domain);
      expect(existsSync(resolve(domainDir, "persona.json"))).toBe(true);
      expect(existsSync(resolve(domainDir, "skills.ts"))).toBe(true);
    }
  });

  it("each domain has a matching .claude/rules/ file", () => {
    const domainsDir = resolve(ROOT, "domains");
    if (!existsSync(domainsDir)) return;
    const domains = readdirSync(domainsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const domain of domains) {
      const ruleFile = resolve(ROOT, `.claude/rules/${domain}-domain.md`);
      expect(existsSync(ruleFile)).toBe(true);
    }
  });

  it("rule files have globs matching their domain directory", () => {
    const domainsDir = resolve(ROOT, "domains");
    if (!existsSync(domainsDir)) return;
    const domains = readdirSync(domainsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const domain of domains) {
      const ruleFile = resolve(ROOT, `.claude/rules/${domain}-domain.md`);
      const content = readFileSync(ruleFile, "utf-8");
      expect(content).toContain(`domains/${domain}`);
    }
  });
});
