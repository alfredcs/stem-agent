"""
Example 05 — Skill Lifecycle (Crystallization, Maturation, Apoptosis)

Demonstrates the biological skill lifecycle in STEM Agent:

    Repeated patterns  ──>  Crystallization  ──>  Progenitor skill
    Successful use     ──>  Maturation       ──>  Committed ──> Mature
    Persistent failure ──>  Apoptosis        ──>  Skill removed

This maps directly to cell biology:
  - Gene expression:  3+ episodes with same pattern triggers skill creation
  - Differentiation:  progenitor (3 activations) → committed (10) → mature
  - Apoptosis:        <30% success rate after 10 activations → removal

Thresholds (from skill-manager.ts):
  CRYSTALLIZATION_THRESHOLD = 3   (episodes to detect a pattern)
  COMMITTED_THRESHOLD       = 3   (activations to advance)
  MATURE_THRESHOLD          = 10  (activations to mature)
  ADVANCE_MIN_SUCCESS       = 0.6 (min success rate to advance)
  REGRESSION_THRESHOLD      = 0.3 (below this → apoptosis)

Prerequisites:
    pip install httpx

Usage:
    python 05_skill_lifecycle.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response


def print_lifecycle_diagram() -> None:
    """Print the skill lifecycle stages."""
    print("""
    SKILL LIFECYCLE (Cell Differentiation Analogy)

    ┌─────────────────────────────────────────────────────────────────┐
    │                                                                 │
    │  Episode patterns detected (3+ similar successful interactions) │
    │                                                                 │
    │           ┌──────────────┐                                      │
    │  ────────>│  PROGENITOR  │  (newborn skill, untested)           │
    │           └──────┬───────┘                                      │
    │                  │  3 successful activations (60%+ success)     │
    │                  v                                              │
    │           ┌──────────────┐                                      │
    │           │  COMMITTED   │  (proven skill, in active use)       │
    │           └──────┬───────┘                                      │
    │                  │  10 successful activations (60%+ success)    │
    │                  v                                              │
    │           ┌──────────────┐                                      │
    │           │   MATURE     │  (reliable, high-priority match)     │
    │           └──────────────┘                                      │
    │                                                                 │
    │  If success rate drops below 30% after 10+ activations:        │
    │                                                                 │
    │           ┌──────────────┐                                      │
    │           │  APOPTOSIS   │  (skill removed — cell death)        │
    │           └──────────────┘                                      │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘
    """)


def simulate_lifecycle() -> None:
    """Simulate the skill lifecycle without a server."""
    print("=" * 70)
    print("SIMULATED SKILL LIFECYCLE")
    print("=" * 70)
    print()
    print("  Simulating what happens inside the agent when patterns emerge...\n")

    # Phase 1: Pattern accumulation
    print("  PHASE 1: Pattern Accumulation")
    print("  " + "-" * 50)
    episodes = [
        {"action": "summarize_paper", "outcome": "completed", "intent": "analysis"},
        {"action": "summarize_paper", "outcome": "completed", "intent": "analysis"},
        {"action": "summarize_paper", "outcome": "completed", "intent": "analysis"},
    ]
    for i, ep in enumerate(episodes, 1):
        print(f"    Episode {i}: {ep['action']} -> {ep['outcome']}")
    print(f"\n    -> 3 episodes with pattern 'summarize_paper' detected!")
    print(f"    -> CRYSTALLIZATION triggered!\n")

    # Phase 2: Skill created
    print("  PHASE 2: Progenitor Skill Born")
    print("  " + "-" * 50)
    skill = {
        "name": "auto_summarize_paper_analysis",
        "maturity": "progenitor",
        "activations": 0,
        "success_rate": 0.0,
    }
    print(f"    Skill: {skill['name']}")
    print(f"    Maturity: {skill['maturity']}")
    print(f"    Activations: {skill['activations']}")
    print()

    # Phase 3: Maturation
    print("  PHASE 3: Maturation Through Use")
    print("  " + "-" * 50)
    activations = [
        (1, True), (2, True), (3, True),  # -> committed
        (4, True), (5, False), (6, True), (7, True),
        (8, True), (9, True), (10, True),  # -> mature
    ]
    for count, success in activations:
        total_success = sum(1 for _, s in activations[:count] if s)
        rate = total_success / count
        old_maturity = skill["maturity"]

        skill["activations"] = count
        skill["success_rate"] = rate

        if rate >= 0.6:
            if count >= 10 and skill["maturity"] != "mature":
                skill["maturity"] = "mature"
            elif count >= 3 and skill["maturity"] == "progenitor":
                skill["maturity"] = "committed"

        status = "OK" if success else "FAIL"
        transition = ""
        if skill["maturity"] != old_maturity:
            transition = f"  ** {old_maturity} -> {skill['maturity']} **"

        print(f"    Activation {count:2d}: [{status:4s}] "
              f"rate={rate:.0%} maturity={skill['maturity']}{transition}")

    print(f"\n    Final: {skill['name']}")
    print(f"    Maturity: {skill['maturity']} (fully differentiated)")
    print(f"    Success rate: {skill['success_rate']:.0%}")
    print()

    # Phase 4: Apoptosis
    print("  PHASE 4: Apoptosis (Skill Death)")
    print("  " + "-" * 50)
    print("    Simulating a skill with persistently poor performance...\n")

    bad_skill = {
        "name": "auto_predict_stock_price",
        "maturity": "progenitor",
        "activations": 0,
        "success_rate": 0.0,
        "source": "crystallized",
    }
    bad_activations = [
        (1, False), (2, True), (3, False), (4, False), (5, False),
        (6, False), (7, True), (8, False), (9, False), (10, False),
    ]
    for count, success in bad_activations:
        total_success = sum(1 for _, s in bad_activations[:count] if s)
        rate = total_success / count
        bad_skill["activations"] = count
        bad_skill["success_rate"] = rate

        if count >= 3 and rate >= 0.6 and bad_skill["maturity"] == "progenitor":
            bad_skill["maturity"] = "committed"

        status = "OK" if success else "FAIL"
        apoptosis = ""
        if count >= 10 and rate < 0.3:
            apoptosis = "  ** APOPTOSIS — skill removed **"

        print(f"    Activation {count:2d}: [{status:4s}] "
              f"rate={rate:.0%}{apoptosis}")

    print(f"\n    Skill '{bad_skill['name']}' was removed.")
    print(f"    Reason: success rate {bad_skill['success_rate']:.0%} < 30% "
          f"after {bad_skill['activations']} activations.")
    print(f"    This prevents unreliable skills from wasting resources.")
    print()


def live_demo(client: StemAgentClient) -> None:
    """Run live interactions to trigger skill crystallization."""
    print("=" * 70)
    print("LIVE SKILL ACCUMULATION")
    print("=" * 70)
    print()
    print("  Sending repeated similar requests to accumulate episodes...")
    print("  The agent's skill manager will detect patterns over time.\n")

    queries = [
        "Summarize the key findings of recent research on attention mechanisms in transformers.",
        "Summarize the main contributions of recent work on multi-agent LLM systems.",
        "Summarize the core ideas in recent papers on retrieval-augmented generation.",
        "Summarize the latest advances in LLM reasoning and chain-of-thought prompting.",
        "Summarize recent research progress on LLM alignment and safety techniques.",
    ]

    for i, query in enumerate(queries, 1):
        print(f"  Request {i}/{len(queries)}: {query[:70]}...")
        response = client.chat(query, caller_id="skill-lifecycle-demo")
        status = response.get("status", "?")
        content_len = len(str(response.get("content", "")))
        print(f"    -> [{status}] {content_len} chars\n")

    print("  After these interactions, the agent's skill manager will:")
    print("  1. Store each as an episode in episodic memory")
    print("  2. Detect the 'summarize research' pattern")
    print("  3. Crystallize a new 'summarize' skill (if threshold met)")
    print("  4. Subsequent similar queries may activate the skill directly")
    print()


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("SKILL LIFECYCLE — Crystallization, Maturation, Apoptosis")
    print("=" * 70)

    print_lifecycle_diagram()

    # Always show the simulation (no server needed)
    simulate_lifecycle()

    # Live demo if server is available
    if client.ensure_running():
        live_demo(client)
    else:
        print("  [Start the server to see live skill accumulation]\n")

    print("=" * 70)
    print("KEY TAKEAWAYS")
    print("=" * 70)
    print("""
  1. Skills are NOT pre-programmed — they emerge from interaction patterns
  2. The maturation process ensures only reliable skills gain priority
  3. Apoptosis removes skills that consistently fail
  4. This mirrors biological cell differentiation:
     - Stem cell (generic agent) → specialized cell (domain agent)
     - Gene expression (pattern detection) → differentiation (skill creation)
     - Cell death (apoptosis) → removal of dysfunctional specializations
    """)


if __name__ == "__main__":
    main()
