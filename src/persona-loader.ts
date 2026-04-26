/**
 * Persona + domain-skill loader.
 *
 * Handles the two-step differentiation bootstrap:
 *   1. Parse a DomainPersona JSON file referenced by DOMAIN_PERSONA env var.
 *   2. Dynamically import `domains/<tag>/skills.js` (compiled from
 *      tsconfig.domains.json) for each domainTag and register its
 *      plugin skills into the agent's SkillManager.
 *
 * Used by both `src/server.ts` (HTTP gateway) and
 * `src/mcp-entrypoint.ts` (MCP stdio).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DomainPersonaSchema } from "@stem-agent/shared";
import type { DomainPersona } from "@stem-agent/shared";
import type { SkillManager } from "@stem-agent/agent-core";
import { createLogger } from "@stem-agent/shared";

const log = createLogger("persona-loader");

/** Project root directory (two levels up from this compiled file). */
function projectRoot(): string {
  // This file compiles to `dist/persona-loader.js`; project root is its parent.
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

/** Load and validate a persona from the given path (absolute or project-relative). */
export function loadPersona(path: string): DomainPersona {
  const full = path.startsWith("/") ? path : resolve(projectRoot(), path);
  const raw = JSON.parse(readFileSync(full, "utf-8"));
  return DomainPersonaSchema.parse(raw);
}

/**
 * Register plugin skills for every domain implied by the persona's domainTags.
 *
 * A tag `T` resolves to `dist/domains/<T>/skills.js`. Missing or un-loadable
 * domain files are logged and skipped so misconfiguration does not crash the
 * agent.
 */
export async function registerPersonaDomainSkills(
  persona: DomainPersona,
  skillManager: SkillManager,
): Promise<string[]> {
  const registered: string[] = [];
  const visited = new Set<string>();

  for (const tag of persona.domainTags) {
    if (visited.has(tag)) continue;
    visited.add(tag);

    const compiled = resolve(projectRoot(), "dist", "domains", tag, "skills.js");
    if (!existsSync(compiled)) {
      log.debug({ tag, compiled }, "no domain skills module for tag (skipping)");
      continue;
    }

    try {
      const mod = await import(pathToFileURL(compiled).href);
      if (typeof mod.registerDomainSkills === "function") {
        await mod.registerDomainSkills(skillManager);
        registered.push(tag);
        log.info({ tag }, "domain skills registered");
      }
    } catch (err) {
      log.warn({ err, tag }, "failed to load domain skills module");
    }
  }

  return registered;
}
