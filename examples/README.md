# STEM Agent Examples

Python examples and Jupyter notebooks demonstrating **cell differentiation** in
STEM Agent — how a single generic agent specializes into domain-specific agents,
just like biological stem cells differentiate into specialized cell types.

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
# Verify connectivity
python 01_quickstart.py

# See cell differentiation in action
python 02_cell_differentiation.py
```

## Examples

| # | File | Description | Server Required |
|---|------|-------------|:-:|
| 01 | `01_quickstart.py` | Health check, agent card, single chat | Yes |
| 02 | `02_cell_differentiation.py` | Create personas, compare behavior differences | Partial* |
| 03 | `03_independent_agents.py` | Parallel async agents on different tasks | Yes |
| 04 | `04_collaborative_pipeline.py` | Multi-agent sequential research pipeline | Yes |
| 05 | `05_skill_lifecycle.py` | Crystallization, maturation, apoptosis simulation | Partial* |
| 06 | `06_cell_differentiation.ipynb` | Interactive notebook with visualizations | Partial* |
| 07 | `07_multi_agent_research.ipynb` | Collaborative arXiv research notebook | Partial* |

\* These examples include offline demonstrations and pre-computed outputs.
They degrade gracefully without a server, showing structure and expected behavior.

## The Cell Differentiation Analogy

```
                  Generic STEM Agent (Stem Cell)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    Research Agent   Code Reviewer   Science Writer
    (reflexion)      (react)         (chain-of-thought)
    High tool use    Low creativity   High verbosity
    Deep reasoning   Precise, terse   Engaging prose
```

### Two Levels of Differentiation

1. **Server-level** (full): Start with `DOMAIN_PERSONA=path/to/persona.json`
2. **Runtime** (adaptive): Different `callerId` values adapt behavior per caller

### Skill Lifecycle (Cell Biology)

| Biological Concept | Agent Equivalent |
|---|---|
| Gene expression | 3+ similar patterns trigger skill creation |
| Cell differentiation | Progenitor → Committed → Mature |
| Apoptosis | <30% success after 10 activations → removal |

## Sample Personas

Ready-to-use persona configurations in `sample_personas/`:

- `research_agent.json` — arXiv-focused, reflexion strategy
- `code_reviewer.json` — React strategy, low creativity, high confidence
- `data_analyst.json` — Chain-of-thought, high tool use
- `science_writer.json` — High creativity and verbosity

Use them with the server:

```bash
DOMAIN_PERSONA=examples/sample_personas/research_agent.json \
  node --env-file=.env dist/server.js
```

## Shared Client

All examples use `stem_client.py`, a lightweight httpx wrapper:

```python
from stem_client import StemAgentClient

client = StemAgentClient()
response = client.chat("What is quantum entanglement?")
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot reach STEM Agent` | Start the server: `npm start` or `docker compose up` |
| `httpx not installed` | `pip install httpx` |
| `Connection refused` | Check `STEM_AGENT_URL` (default: `http://localhost:8000`) |
| Notebooks won't run | Install Jupyter: `pip install jupyter` |
