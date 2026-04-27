#!/usr/bin/env node
// differentiate.mjs — scaffold a new domain-differentiated stem-agent.
//
// Subcommands:
//   register  Read persona JSON from stdin, create domain dir, optionally edit
//             a caller-supplied .mcp.json, and (optionally) build.
//   list      Print known domains (directories under domains/ with persona.json).
//   remove    Delete a domain dir and its .mcp.json entry.
//   doctor    Health check: template present, build artifacts present, .mcp.json
//             entries resolve to existing personas.
//
// Flags (register):
//   --slug <s>           Domain slug. Required. Must match /^[a-z0-9][a-z0-9-]*$/.
//   --mcp-json <path>    Absolute path to a .mcp.json to upsert into. Optional.
//   --mcp-server-name <s> Key to use under "mcpServers". Defaults to stem-<slug>.
//   --build              Run `npm run build` after writing files.
//   --force              Overwrite existing domain dir.
//   --dry-run            Print planned actions without touching disk.
//
// Flags (remove):
//   --slug <s>           Required.
//   --mcp-json <path>    If supplied, removes the stem-<slug> entry.
//   --mcp-server-name <s> Override the default key (stem-<slug>).
//   --keep-files         Only update .mcp.json; leave domains/<slug>/ on disk.
//
// Flags (doctor):
//   --mcp-json <path>    .mcp.json to cross-check.
//
// Exit codes: 0 ok, 1 validation, 2 I/O, 3 build, 4 doctor-unhealthy.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, renameSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_DIR = join(PROJECT_ROOT, "domains", "_template");
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function die(code, msg) { process.stderr.write(`[differentiate] ${msg}\n`); process.exit(code); }
function info(msg) { process.stderr.write(`[differentiate] ${msg}\n`); }

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) { out[key] = true; }
      else { out[key] = next; i++; }
    } else { out._.push(a); }
  }
  return out;
}

function readStdin() {
  const fd = 0;
  try { return readFileSync(fd, "utf-8"); } catch { return ""; }
}

function validatePersona(p) {
  const errs = [];
  if (!p || typeof p !== "object") errs.push("persona must be an object");
  if (typeof p?.name !== "string" || !p.name) errs.push("name must be a non-empty string");
  if (typeof p?.systemPrompt !== "string" || !p.systemPrompt) errs.push("systemPrompt must be a non-empty string");
  if (!Array.isArray(p?.domainTags)) errs.push("domainTags must be an array");
  return errs;
}

function upsertMcpJson(path, serverName, slug) {
  let obj = { mcpServers: {} };
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf-8").trim();
    if (raw) {
      try { obj = JSON.parse(raw); }
      catch (e) { die(2, `failed to parse ${path}: ${e.message}`); }
    }
    if (!obj.mcpServers || typeof obj.mcpServers !== "object") obj.mcpServers = {};
  }
  // Auto-include --env-file=.env when present so the child process sees
  // LLM credentials without manual .mcp.json surgery. Node 20.6+ supports
  // --env-file natively; if .env is missing we emit the bare invocation.
  const envFileArg = existsSync(join(PROJECT_ROOT, ".env"))
    ? ["--env-file=.env"]
    : [];
  obj.mcpServers[serverName] = {
    command: "node",
    args: [...envFileArg, "dist/mcp-entrypoint.js"],
    cwd: PROJECT_ROOT,
    env: {
      DOMAIN_PERSONA: `domains/${slug}/persona.json`,
      AGENT_ID: `${slug}-agent-001`,
      AGENT_NAME: serverName,
    },
  };
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  renameSync(tmp, path);
}

function cmdRegister(args) {
  const slug = args.slug;
  if (!slug || typeof slug !== "string") die(1, "--slug is required");
  if (!SLUG_RE.test(slug)) die(1, `--slug must match ${SLUG_RE} (got "${slug}")`);

  const stdinRaw = readStdin();
  if (!stdinRaw.trim()) die(1, "persona JSON must be piped on stdin");
  let persona;
  try { persona = JSON.parse(stdinRaw); }
  catch (e) { die(1, `persona JSON parse error: ${e.message}`); }
  const errs = validatePersona(persona);
  if (errs.length) die(1, `persona invalid:\n  - ${errs.join("\n  - ")}`);

  const domainDir = join(PROJECT_ROOT, "domains", slug);
  const personaPath = join(domainDir, "persona.json");
  const skillsPath = join(domainDir, "skills.ts");

  if (existsSync(domainDir) && !args.force) {
    die(1, `domains/${slug} already exists — pass --force to overwrite`);
  }

  const plan = {
    domainDir,
    personaPath,
    skillsPath,
    mcpJson: args["mcp-json"] || null,
    mcpServerName: args["mcp-server-name"] || `stem-${slug}`,
    build: Boolean(args.build),
  };

  if (args["dry-run"]) {
    process.stdout.write(JSON.stringify({ dryRun: true, plan, persona }, null, 2) + "\n");
    return;
  }

  mkdirSync(domainDir, { recursive: true });
  writeFileSync(personaPath, JSON.stringify(persona, null, 2) + "\n");
  if (!existsSync(skillsPath)) {
    copyFileSync(join(TEMPLATE_DIR, "skills.ts"), skillsPath);
  }
  info(`wrote domains/${slug}/persona.json + skills.ts`);

  if (plan.mcpJson) {
    upsertMcpJson(plan.mcpJson, plan.mcpServerName, slug);
    info(`upserted "${plan.mcpServerName}" into ${plan.mcpJson}`);
  }

  if (plan.build) {
    info("running `npm run build` ...");
    const r = spawnSync("npm", ["run", "build"], { cwd: PROJECT_ROOT, stdio: "inherit" });
    if (r.status !== 0) die(3, `build failed with status ${r.status}`);
  }

  process.stdout.write(JSON.stringify({ ok: true, slug, plan }, null, 2) + "\n");
}

function cmdList() {
  const domainsDir = join(PROJECT_ROOT, "domains");
  if (!existsSync(domainsDir)) { process.stdout.write("[]\n"); return; }
  const entries = readdirSync(domainsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== "_template")
    .map(d => d.name)
    .filter(name => existsSync(join(domainsDir, name, "persona.json")))
    .map(name => {
      try {
        const p = JSON.parse(readFileSync(join(domainsDir, name, "persona.json"), "utf-8"));
        return { slug: name, name: p.name, domainTags: p.domainTags ?? [] };
      } catch { return { slug: name, name: "(invalid persona.json)", domainTags: [] }; }
    });
  process.stdout.write(JSON.stringify(entries, null, 2) + "\n");
}

function removeMcpEntry(path, serverName) {
  if (!existsSync(path)) return { changed: false, reason: "mcp-json does not exist" };
  const raw = readFileSync(path, "utf-8").trim();
  if (!raw) return { changed: false, reason: "mcp-json is empty" };
  let obj;
  try { obj = JSON.parse(raw); }
  catch (e) { die(2, `failed to parse ${path}: ${e.message}`); }
  if (!obj.mcpServers || typeof obj.mcpServers !== "object") return { changed: false, reason: "no mcpServers block" };
  if (!(serverName in obj.mcpServers)) return { changed: false, reason: `entry "${serverName}" not found` };
  delete obj.mcpServers[serverName];
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n");
  renameSync(tmp, path);
  return { changed: true };
}

function cmdRemove(args) {
  const slug = args.slug;
  if (!slug || typeof slug !== "string") die(1, "--slug is required");
  if (!SLUG_RE.test(slug)) die(1, `--slug must match ${SLUG_RE}`);

  const domainDir = join(PROJECT_ROOT, "domains", slug);
  const mcpJson = args["mcp-json"] || null;
  const serverName = args["mcp-server-name"] || `stem-${slug}`;
  const keepFiles = Boolean(args["keep-files"]);

  const result = { slug, removedDir: false, mcpEntry: null };

  if (!keepFiles) {
    if (existsSync(domainDir)) {
      rmSync(domainDir, { recursive: true, force: true });
      result.removedDir = true;
      info(`removed domains/${slug}/`);
    } else {
      info(`domains/${slug}/ does not exist — skipping file removal`);
    }
  }

  if (mcpJson) {
    result.mcpEntry = removeMcpEntry(mcpJson, serverName);
    info(result.mcpEntry.changed
      ? `removed "${serverName}" from ${mcpJson}`
      : `mcp-json unchanged: ${result.mcpEntry.reason}`);
  }

  process.stdout.write(JSON.stringify({ ok: true, ...result }, null, 2) + "\n");
}

function cmdDoctor(args) {
  const report = {
    projectRoot: PROJECT_ROOT,
    checks: [],
    ok: true,
  };
  const add = (name, ok, detail) => {
    report.checks.push({ name, ok, detail });
    if (!ok) report.ok = false;
  };

  // Template present
  add("template:persona.json", existsSync(join(TEMPLATE_DIR, "persona.json")), "domains/_template/persona.json");
  add("template:skills.ts", existsSync(join(TEMPLATE_DIR, "skills.ts")), "domains/_template/skills.ts");

  // mcp-entrypoint.js built
  const entrypoint = join(PROJECT_ROOT, "dist", "mcp-entrypoint.js");
  add("build:mcp-entrypoint", existsSync(entrypoint),
    existsSync(entrypoint) ? entrypoint : `missing ${entrypoint} — run \`npm run build\``);

  // Each domain's compiled skills
  const domainsDir = join(PROJECT_ROOT, "domains");
  if (existsSync(domainsDir)) {
    for (const d of readdirSync(domainsDir, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === "_template") continue;
      const personaPath = join(domainsDir, d.name, "persona.json");
      if (!existsSync(personaPath)) continue;
      const compiled = join(PROJECT_ROOT, "dist", "domains", d.name, "skills.js");
      add(`domain:${d.name}:compiled`, existsSync(compiled),
        existsSync(compiled) ? compiled : `${compiled} missing — rebuild`);
    }
  }

  // .mcp.json cross-check
  const mcpJson = args["mcp-json"];
  if (mcpJson) {
    if (!existsSync(mcpJson)) {
      add(`mcp-json:${mcpJson}`, false, "file does not exist");
    } else {
      try {
        const obj = JSON.parse(readFileSync(mcpJson, "utf-8"));
        const servers = obj.mcpServers || {};
        for (const [key, cfg] of Object.entries(servers)) {
          if (!key.startsWith("stem-")) continue;
          const personaRel = cfg?.env?.DOMAIN_PERSONA;
          if (!personaRel) {
            add(`mcp-entry:${key}`, false, "no env.DOMAIN_PERSONA set");
            continue;
          }
          const cwd = cfg.cwd || PROJECT_ROOT;
          const personaAbs = personaRel.startsWith("/") ? personaRel : join(cwd, personaRel);
          add(`mcp-entry:${key}`, existsSync(personaAbs),
            existsSync(personaAbs) ? personaAbs : `persona file missing: ${personaAbs}`);
        }
      } catch (e) {
        add(`mcp-json:${mcpJson}`, false, `parse error: ${e.message}`);
      }
    }
  }

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.ok) process.exit(4);
}

const args = parseArgs(process.argv.slice(2));
const sub = args._[0];
if (sub === "register") cmdRegister(args);
else if (sub === "list") cmdList();
else if (sub === "remove") cmdRemove(args);
else if (sub === "doctor") cmdDoctor(args);
else {
  process.stderr.write("usage: differentiate.mjs <register|list|remove|doctor> [flags]\n");
  process.exit(1);
}
