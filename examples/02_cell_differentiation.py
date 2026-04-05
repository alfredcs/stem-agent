"""
Example 02 — Cell Differentiation

Demonstrates the core concept: a single generic STEM Agent (stem cell) can be
specialized into domain-specific agents through DomainPersona configurations,
just as a biological stem cell differentiates into specialized cell types.

    Stem Cell (generic agent)
        |
        +-- Research Agent    (reflexion strategy, high tool use)
        +-- Code Reviewer     (react strategy, low creativity)
        +-- Data Analyst      (chain-of-thought, high tool use)
        +-- Science Writer    (high creativity, high verbosity)

The persona controls:
  - System prompt (domain expertise & constraints)
  - Reasoning strategy (reflexion, react, chain_of_thought, etc.)
  - Behavior parameters (depth, creativity, verbosity, confidence)
  - Tool restrictions (allowlist, required MCP servers)
  - Domain tags (for skill matching)

Prerequisites:
    pip install httpx

Usage:
    python 02_cell_differentiation.py
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import (
    StemAgentClient,
    print_persona,
    print_response,
    compare_responses,
    bar_chart,
)

# ---------------------------------------------------------------------------
# Define four domain personas (the "differentiation signals")
# ---------------------------------------------------------------------------

PERSONAS = {
    "research": {
        "name": "ResearchAgent",
        "systemPrompt": (
            "You are a research agent specialized in academic literature review. "
            "Search for relevant papers, extract key findings, and identify research gaps. "
            "Always cite sources with arXiv IDs or DOIs."
        ),
        "allowedIntents": ["question", "analysis_request"],
        "forbiddenTopics": [],
        "preferredStrategy": "reflexion",
        "defaultBehavior": {
            "reasoningDepth": 5,
            "confidenceThreshold": 0.7,
            "creativityLevel": 0.3,
            "toolUsePreference": 0.8,
            "verbosityLevel": 0.7,
        },
        "requiredMCPServers": ["arxiv"],
        "toolAllowlist": ["search_arxiv", "search_by_author"],
        "domainTags": ["research", "academic", "papers"],
    },
    "code_reviewer": {
        "name": "CodeReviewAgent",
        "systemPrompt": (
            "You are a code review agent. Analyze code for bugs, security "
            "vulnerabilities, and performance issues. Be precise and cite line numbers."
        ),
        "allowedIntents": ["analysis_request", "command", "debugging"],
        "forbiddenTopics": ["generating exploit code"],
        "preferredStrategy": "react",
        "defaultBehavior": {
            "reasoningDepth": 4,
            "confidenceThreshold": 0.8,
            "creativityLevel": 0.1,
            "toolUsePreference": 0.6,
            "verbosityLevel": 0.5,
        },
        "requiredMCPServers": [],
        "toolAllowlist": [],
        "domainTags": ["code", "review", "security"],
    },
    "data_analyst": {
        "name": "DataAnalystAgent",
        "systemPrompt": (
            "You are a data analyst agent. Transform raw data into actionable insights. "
            "Use statistical methods and always quantify uncertainty."
        ),
        "allowedIntents": ["question", "analysis_request", "command"],
        "forbiddenTopics": [],
        "preferredStrategy": "chain_of_thought",
        "defaultBehavior": {
            "reasoningDepth": 4,
            "confidenceThreshold": 0.75,
            "creativityLevel": 0.4,
            "toolUsePreference": 0.9,
            "verbosityLevel": 0.6,
        },
        "requiredMCPServers": [],
        "toolAllowlist": [],
        "domainTags": ["data", "analytics", "statistics"],
    },
    "science_writer": {
        "name": "ScienceWriterAgent",
        "systemPrompt": (
            "You are a science communication agent. Translate complex technical "
            "concepts into clear, engaging prose for a general audience. "
            "Use analogies and narrative structure."
        ),
        "allowedIntents": ["question", "analysis_request", "creative"],
        "forbiddenTopics": [],
        "preferredStrategy": "chain_of_thought",
        "defaultBehavior": {
            "reasoningDepth": 3,
            "confidenceThreshold": 0.6,
            "creativityLevel": 0.8,
            "toolUsePreference": 0.3,
            "verbosityLevel": 0.9,
        },
        "requiredMCPServers": [],
        "toolAllowlist": [],
        "domainTags": ["writing", "science", "communication"],
    },
}


def main() -> None:
    client = StemAgentClient()

    # ── Step 1: Show the undifferentiated agent ───────────────────────────
    print("=" * 70)
    print("CELL DIFFERENTIATION DEMO")
    print("=" * 70)
    print()
    print("  In biology, a stem cell is an undifferentiated cell that can")
    print("  specialize into any cell type when given the right signals.")
    print()
    print("  In STEM Agent, a generic agent differentiates into a domain-")
    print("  specific agent when given a DomainPersona configuration.")
    print()

    # ── Step 2: Display persona configurations ────────────────────────────
    print("=" * 70)
    print("THE DIFFERENTIATION SIGNALS (DomainPersona configs)")
    print("=" * 70)

    for role, persona in PERSONAS.items():
        print(f"\n  [{role.upper()}]")
        print_persona(persona)

    # ── Step 3: Visualize behavior differences ────────────────────────────
    print("=" * 70)
    print("BEHAVIOR PARAMETER COMPARISON")
    print("=" * 70)

    chart_data = {}
    for role, persona in PERSONAS.items():
        chart_data[persona["name"]] = persona["defaultBehavior"]
    bar_chart(chart_data)
    print()

    # ── Step 4: Send same question, different callers ─────────────────────
    if not client.ensure_running():
        print("\n  [Skipping live demo — server not running]")
        print("  The personas above show how each agent WOULD respond differently.")
        print("  Start the server and re-run to see live differentiation.\n")
        return

    print()
    print("=" * 70)
    print("LIVE DIFFERENTIATION: Same question, different specialists")
    print("=" * 70)

    question = (
        "Explain how neural networks learn. "
        "What are the key mechanisms and why do they work?"
    )
    print(f"\n  Question: {question}\n")

    responses = []
    labels = []

    for role, persona in PERSONAS.items():
        caller_id = f"demo-{role}"
        print(f"  Sending as {persona['name']} (callerId={caller_id})...")
        resp = client.chat(question, caller_id=caller_id)
        responses.append(resp)
        labels.append(persona["name"])

    compare_responses(responses, labels)

    # ── Step 5: Show caller profile adaptation ────────────────────────────
    print("\n" + "=" * 70)
    print("CALLER PROFILE ADAPTATION")
    print("=" * 70)
    print("  After interacting, each caller develops a unique profile.\n")

    for role in PERSONAS:
        caller_id = f"demo-{role}"
        try:
            profile = client.get_profile(caller_id)
            style = profile.get("style", {})
            print(f"  {caller_id}:")
            print(f"    Verbosity:      {style.get('verbosity', '?')}")
            print(f"    Technical depth: {style.get('technicalDepth', '?')}")
        except Exception:
            print(f"  {caller_id}: (profile not yet available)")
    print()

    # ── Step 6: Explain full differentiation path ─────────────────────────
    print("=" * 70)
    print("FULL DIFFERENTIATION (server-level)")
    print("=" * 70)
    print()
    print("  For complete differentiation, start the server with a persona:")
    print()
    print("    DOMAIN_PERSONA=domains/finance/persona.json \\")
    print("      node --env-file=.env dist/server.js")
    print()
    print("  This sets the system prompt, restricts tools, and changes the")
    print("  reasoning strategy for ALL interactions on that server instance.")
    print("  See sample_personas/ for ready-to-use persona files.")


if __name__ == "__main__":
    main()
