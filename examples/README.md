# STEM Agent Examples

Production-grade Python examples and Jupyter notebooks demonstrating **cell
differentiation** in STEM Agent — how a single generic agent specializes into
domain-specific agents, just like biological stem cells differentiate into
specialized cell types.

Each example uses a **real-world scenario** to showcase specific STEM Agent
capabilities: incident response, due diligence, clinical trials, DevOps
automation, and policy research.

## Prerequisites

```bash
pip install httpx

# Start the STEM Agent server
cd stem-agent
npm run build
npm start
# Or: docker compose --profile prod up -d
```

## Quick Start

```bash
# Verify connectivity + full capability discovery
python 01_quickstart.py

# See cell differentiation in action (incident response)
python 02_cell_differentiation.py
```

## Examples

| # | File | Scenario | Key Features |
|---|------|----------|--------------|
| 01 | `01_quickstart.py` | Production Integration Verification | Health, Agent Card, Streaming, A2A, Behavior, Tasks |
| 02 | `02_cell_differentiation.py` | Enterprise Incident Response Team | 5 personas, forbidden topics, tool allowlists, profiles |
| 03 | `03_independent_agents.py` | Technology Landscape Scanner | Parallel async agents, profile divergence, aggregation |
| 04 | `04_collaborative_pipeline.py` | M&A Due Diligence Pipeline | 6-stage pipeline, quality gate, metadata, retry |
| 05 | `05_skill_lifecycle.py` | Adaptive DevOps Runbook Learning | Crystallization, maturation, apoptosis simulation |
| 06 | `06_cell_differentiation.ipynb` | Clinical Trial Safety Analysis | Medical personas, safety constraints, regulatory writing |
| 07 | `07_multi_agent_research.ipynb` | AI Governance Research (Full Protocol) | REST, A2A, Async Tasks, SSE Streaming, Profiles |

## Feature Coverage Matrix

| Feature | 01 | 02 | 03 | 04 | 05 | 06 | 07 |
|---------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Health Check | x | | | | | | |
| Agent Card (A2A Discovery) | x | | | | | | x |
| DomainPersona / Differentiation | | x | | | | x | |
| Behavior Parameters | x | x | | | | x | x |
| Forbidden Topics | | x | | | | x | |
| Tool Allowlists | | x | | | | x | |
| Synchronous Chat | x | x | x | x | x | x | x |
| SSE Streaming | x | | | | | | x |
| A2A Protocol (JSON-RPC 2.0) | x | | | | | | x |
| Async Tasks | x | | x | | | | x |
| Parallel Execution (asyncio) | | | x | | | | |
| Sequential Pipeline | | | | x | | | x |
| Quality Gate (reject/rewrite) | | | | x | | | |
| Metadata Passing | | | | x | | | x |
| Caller Profile Adaptation | | x | x | | | x | x |
| Skill Crystallization | | | | | x | | |
| Skill Maturation | | | | | x | | |
| Skill Apoptosis | | | | | x | | |

## Scenarios

### 01 — Production Integration Verification
Run 7 integration checks against a STEM Agent deployment: health, agent card,
tool discovery, behavior params, streaming, A2A handshake, and async tasks.
The smoke test you'd run after deploying a new instance.

### 02 — Enterprise Incident Response Team
Five specialist agents (Incident Commander, Root Cause Engineer, Communications
Lead, Security Analyst, Post-Mortem Author) analyze the same P1 production
outage. Each has dramatically different reasoning strategies, behavior params,
forbidden topics, and tool access — demonstrating how persona configuration
controls agent behavior.

### 03 — Technology Landscape Scanner
A VP of Engineering asks "Should we adopt WebAssembly for backend services?"
Five parallel agents (Academic Researcher, Open Source Scout, Industry
Benchmarker, Risk Analyst, Adoption Strategist) investigate simultaneously
via `asyncio.gather`, producing a comprehensive landscape analysis.

### 04 — M&A Due Diligence Pipeline
Six agents collaborate sequentially to produce a startup due diligence report:
Market Intel → Technical Assessment → Financial Analysis → Risk Evaluation →
Report Writer → Senior Reviewer. The Senior Reviewer acts as a quality gate —
reports scoring below 7/10 trigger re-work of the Writer stage.

### 05 — Adaptive DevOps Runbook Learning
Simulates the full skill lifecycle with realistic incidents. Repeated DB
timeout incidents trigger skill crystallization, successful resolutions mature
the skill to production-ready, while an unreliable traffic prediction skill
undergoes apoptosis (programmed cell death).

### 06 — Clinical Trial Safety Analysis (Notebook)
Four medical domain specialists (Literature Reviewer, Biostatistician, Safety
Reviewer, Regulatory Writer) analyze Phase III clinical trial data for a
GLP-1 receptor agonist. Demonstrates safety constraints (forbidden topics per
specialist) and regulatory compliance writing.

### 07 — AI Governance Research (Notebook)
End-to-end research pipeline demonstrating **every major STEM Agent protocol**:
REST, A2A JSON-RPC 2.0, async tasks, SSE streaming, caller profiles, and
behavior inspection — all in a single AI governance policy workflow.

## The Cell Differentiation Analogy

```
                  Generic STEM Agent (Stem Cell)
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
 Incident Commander   Safety Reviewer   Regulatory Writer
 (react, fast)        (react, strict)   (CoT, formal)
 Low verbosity        Low creativity    High verbosity
 Action-oriented      Conservative      Comprehensive
```

### Two Levels of Differentiation

1. **Server-level** (full): Start with `DOMAIN_PERSONA=path/to/persona.json`
2. **Runtime** (adaptive): Different `callerId` values adapt behavior per caller

### Skill Lifecycle (Biological Analogy)

| Biology | Agent | Threshold |
|---|---|---|
| Gene expression | Pattern detection | 3+ similar episodes |
| Cell differentiation | Progenitor → Committed → Mature | 3 → 10 activations |
| Immune tolerance | Forbidden topics | Persona config |
| Apoptosis (cell death) | Skill removal | <30% success after 10 activations |
| Epigenetic memory | Caller profile EMA | Continuous per interaction |

## Shared Client

All examples use `stem_client.py`, a lightweight httpx wrapper:

```python
from stem_client import StemAgentClient

client = StemAgentClient()

# Synchronous
response = client.chat("Analyze this incident...", caller_id="sre-bot")

# Streaming (SSE)
for event in client.stream("Explain quantum computing"):
    print(event)

# Async
response = await client.achat("Research WebAssembly...")

# A2A Protocol
result = client.a2a_send("tasks/send", {"message": {...}})

# Async Tasks
task = client.create_task("Long analysis...")
result = client.get_task(task["id"])
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot reach STEM Agent` | Start the server: `npm start` or `docker compose up` |
| `httpx not installed` | `pip install httpx` |
| `Connection refused` | Check `STEM_AGENT_URL` (default: `http://localhost:8080`) |
| Notebooks won't run | Install Jupyter: `pip install jupyter` |
| Streaming hangs | Increase timeout: `StemAgentClient(timeout=120)` |
| A2A returns error | A2A protocol may need configuration — check server logs |
