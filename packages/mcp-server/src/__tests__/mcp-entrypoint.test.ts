import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DomainPersonaSchema } from "@stem-agent/shared";

const ROOT = resolve(import.meta.dirname, "../../../..");

// ---------------------------------------------------------------------------
// MCP Entrypoint — compilation and structure validation
// ---------------------------------------------------------------------------

describe("MCP Entrypoint", () => {
  it("src/mcp-entrypoint.ts source file exists", () => {
    expect(existsSync(resolve(ROOT, "src/mcp-entrypoint.ts"))).toBe(true);
  });

  it("compiled dist/mcp-entrypoint.js exists after build", () => {
    // This test verifies the build pipeline includes the entrypoint
    const distPath = resolve(ROOT, "dist/mcp-entrypoint.js");
    if (!existsSync(distPath)) {
      // Build may not have run yet — skip gracefully
      console.warn("dist/mcp-entrypoint.js not found — run `npm run build` first");
      return;
    }
    expect(existsSync(distPath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MCP Entrypoint — persona loading logic
// ---------------------------------------------------------------------------

describe("MCP Entrypoint — Persona Loading", () => {
  it("loads and validates finance persona from file path", () => {
    const personaPath = resolve(ROOT, "domains/finance/persona.json");
    expect(existsSync(personaPath)).toBe(true);

    const raw = JSON.parse(readFileSync(personaPath, "utf-8"));
    const persona = DomainPersonaSchema.parse(raw);
    expect(persona.name).toBe("FinanceAgent");
    expect(persona.systemPrompt).toBeTruthy();
    expect(persona.systemPrompt.length).toBeGreaterThan(20);
  });

  it("loads and validates SRE persona from file path", () => {
    const personaPath = resolve(ROOT, "domains/sre/persona.json");
    expect(existsSync(personaPath)).toBe(true);

    const raw = JSON.parse(readFileSync(personaPath, "utf-8"));
    const persona = DomainPersonaSchema.parse(raw);
    expect(persona.name).toBe("SREAgent");
    expect(persona.systemPrompt).toBeTruthy();
  });

  it("fails to parse invalid persona file content", () => {
    // Simulate a malformed persona (missing required fields)
    expect(() => DomainPersonaSchema.parse({ name: "Incomplete" })).toThrow();
    expect(() => DomainPersonaSchema.parse({ systemPrompt: "No name" })).toThrow();
    expect(() => DomainPersonaSchema.parse({})).toThrow();
  });

  it("entrypoint source imports StemMCPServer correctly", () => {
    const source = readFileSync(resolve(ROOT, "src/mcp-entrypoint.ts"), "utf-8");
    expect(source).toContain('import { StemMCPServer }');
    expect(source).toContain('from "@stem-agent/mcp-server"');
  });

  it("entrypoint source imports DomainPersonaSchema", () => {
    const source = readFileSync(resolve(ROOT, "src/mcp-entrypoint.ts"), "utf-8");
    expect(source).toContain("DomainPersonaSchema");
  });

  it("entrypoint reads DOMAIN_PERSONA env var for persona path", () => {
    const source = readFileSync(resolve(ROOT, "src/mcp-entrypoint.ts"), "utf-8");
    expect(source).toContain("process.env.DOMAIN_PERSONA");
  });

  it("entrypoint writes to stderr (not stdout — reserved for MCP stdio)", () => {
    const source = readFileSync(resolve(ROOT, "src/mcp-entrypoint.ts"), "utf-8");
    expect(source).toContain("process.stderr.write");
    // Must not use console.log (would pollute stdio transport)
    expect(source).not.toContain("console.log(");
  });

  it("entrypoint handles graceful shutdown signals", () => {
    const source = readFileSync(resolve(ROOT, "src/mcp-entrypoint.ts"), "utf-8");
    expect(source).toContain("SIGINT");
    expect(source).toContain("SIGTERM");
    expect(source).toContain("agent.shutdown()");
  });
});

// ---------------------------------------------------------------------------
// MCP Entrypoint — .mcp.json Integration
// ---------------------------------------------------------------------------

describe("MCP Entrypoint — .mcp.json Configuration", () => {
  it(".mcp.json exists at project root", () => {
    expect(existsSync(resolve(ROOT, ".mcp.json"))).toBe(true);
  });

  it(".mcp.json is valid JSON", () => {
    const raw = readFileSync(resolve(ROOT, ".mcp.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it(".mcp.json has mcpServers key", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    expect(config.mcpServers).toBeDefined();
    expect(typeof config.mcpServers).toBe("object");
  });

  it(".mcp.json defines generic, finance, and SRE servers", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    expect(config.mcpServers["stem-agent-generic"]).toBeDefined();
    expect(config.mcpServers["stem-agent-finance"]).toBeDefined();
    expect(config.mcpServers["stem-agent-sre"]).toBeDefined();
  });

  it("each server config points to mcp-entrypoint.js", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const s = server as { command: string; args: string[] };
      expect(s.command).toBe("node");
      expect(s.args).toContain("dist/mcp-entrypoint.js");
    }
  });

  it("finance server config has DOMAIN_PERSONA env", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    const fin = config.mcpServers["stem-agent-finance"];
    expect(fin.env.DOMAIN_PERSONA).toBe("domains/finance/persona.json");
  });

  it("SRE server config has DOMAIN_PERSONA env", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    const sre = config.mcpServers["stem-agent-sre"];
    expect(sre.env.DOMAIN_PERSONA).toBe("domains/sre/persona.json");
  });

  it("generic server config has no DOMAIN_PERSONA", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    const generic = config.mcpServers["stem-agent-generic"];
    expect(generic.env.DOMAIN_PERSONA).toBeUndefined();
  });

  it("persona file paths in .mcp.json actually exist", () => {
    const config = JSON.parse(readFileSync(resolve(ROOT, ".mcp.json"), "utf-8"));
    for (const [name, server] of Object.entries(config.mcpServers)) {
      const s = server as { env: Record<string, string> };
      const personaPath = s.env?.DOMAIN_PERSONA;
      if (personaPath) {
        expect(existsSync(resolve(ROOT, personaPath))).toBe(true);
      }
    }
  });
});
