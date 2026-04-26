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
import type { DomainPersona } from "@stem-agent/shared";
import type { SkillManager } from "@stem-agent/agent-core";
/** Load and validate a persona from the given path (absolute or project-relative). */
export declare function loadPersona(path: string): DomainPersona;
/**
 * Register plugin skills for every domain implied by the persona's domainTags.
 *
 * A tag `T` resolves to `dist/domains/<T>/skills.js`. Missing or un-loadable
 * domain files are logged and skipped so misconfiguration does not crash the
 * agent.
 */
export declare function registerPersonaDomainSkills(persona: DomainPersona, skillManager: SkillManager): Promise<string[]>;
//# sourceMappingURL=persona-loader.d.ts.map