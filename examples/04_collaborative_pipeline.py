"""
Example 04 — Collaborative Pipeline (Multi-Agent Handoff)

Four specialized agents collaborate in a sequential pipeline, each passing
its output to the next. This demonstrates the inter-agent collaboration
pattern where differentiated agents work together on a complex task.

Pipeline:

    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  SCOUT   │─────>│ ANALYST  │─────>│  WRITER  │─────>│  CRITIC  │
    │  Search  │      │ Evaluate │      │ Synthesize│      │  Review  │
    └──────────┘      └──────────┘      └──────────┘      └──────────┘
    Find relevant      Identify key      Write executive   Review for
    papers on          findings and       summary from      accuracy and
    arXiv              rank approaches    analysis          completeness

Prerequisites:
    pip install httpx

Usage:
    python 04_collaborative_pipeline.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response, timed

# ---------------------------------------------------------------------------
# Pipeline stages
# ---------------------------------------------------------------------------

TOPIC = "LLM agents for autonomous scientific discovery"

STAGES = [
    {
        "name": "Scout",
        "caller_id": "pipeline-scout",
        "prompt_template": (
            "Search for recent research on '{topic}'. "
            "List the 5 most relevant papers with their key contributions. "
            "Focus on papers from 2024-2025."
        ),
    },
    {
        "name": "Analyst",
        "caller_id": "pipeline-analyst",
        "prompt_template": (
            "Based on the following research survey, identify the 3 most "
            "promising approaches and explain why they stand out. "
            "Rank them by potential impact.\n\n"
            "Survey results:\n{previous_output}"
        ),
    },
    {
        "name": "Writer",
        "caller_id": "pipeline-writer",
        "prompt_template": (
            "Write a concise executive summary (300-400 words) of these "
            "research findings for a technical audience. Use clear structure "
            "with sections.\n\n"
            "Analysis:\n{previous_output}"
        ),
    },
    {
        "name": "Critic",
        "caller_id": "pipeline-critic",
        "prompt_template": (
            "Review the following executive summary for accuracy, completeness, "
            "and clarity. List specific improvements needed, then provide a "
            "quality score (1-10) with justification.\n\n"
            "Summary to review:\n{previous_output}"
        ),
    },
]


def run_pipeline(client: StemAgentClient) -> list[dict]:
    """Execute the collaborative pipeline sequentially."""
    results = []
    previous_output = ""

    for stage in STAGES:
        prompt = stage["prompt_template"].format(
            topic=TOPIC,
            previous_output=previous_output,
        )

        print(f"\n  [{stage['name'].upper()}] Sending to {stage['caller_id']}...")
        print(f"  Prompt: {prompt[:100]}...")
        print()

        start = time.perf_counter()
        response = client.chat(
            prompt,
            caller_id=stage["caller_id"],
            metadata={"pipeline_stage": stage["name"], "topic": TOPIC},
        )
        elapsed = time.perf_counter() - start

        content = str(response.get("content", ""))
        result = {
            "stage": stage["name"],
            "caller_id": stage["caller_id"],
            "response": response,
            "elapsed": elapsed,
        }
        results.append(result)

        print_response(response, show_trace=False)
        print(f"  Stage completed in {elapsed:.2f}s")

        # Pass output to next stage
        previous_output = content

    return results


def print_pipeline_diagram() -> None:
    """Print ASCII pipeline diagram."""
    print()
    print("  Pipeline Flow:")
    print()
    print("    ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐")
    print("    │  SCOUT   │─────>│ ANALYST  │─────>│  WRITER  │─────>│  CRITIC  │")
    print("    │  Search  │      │ Evaluate │      │Synthesize│      │  Review  │")
    print("    └──────────┘      └──────────┘      └──────────┘      └──────────┘")
    print()


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("COLLABORATIVE PIPELINE — Multi-Agent Research")
    print("=" * 70)
    print(f"\n  Topic: {TOPIC}")
    print_pipeline_diagram()

    if not client.ensure_running():
        print("\n  [Showing pipeline structure — start server for live execution]\n")
        for i, stage in enumerate(STAGES, 1):
            arrow = " --> " if i < len(STAGES) else ""
            print(f"  Stage {i}: {stage['name']} ({stage['caller_id']})")
            print(f"    {stage['prompt_template'][:80]}...")
            print()
        return

    # ── Execute pipeline ──────────────────────────────────────────────────
    print("Executing pipeline...\n")
    overall_start = time.perf_counter()
    results = run_pipeline(client)
    overall_elapsed = time.perf_counter() - overall_start

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("PIPELINE SUMMARY")
    print("=" * 70)
    print(f"\n  Topic:       {TOPIC}")
    print(f"  Stages:      {len(results)}")
    print(f"  Total time:  {overall_elapsed:.2f}s\n")

    print("  Per-stage timing:")
    for r in results:
        bar_len = int(r["elapsed"] * 5)
        bar = "#" * bar_len
        status = r["response"].get("status", "?")
        print(f"    {r['stage']:12s} [{status}] |{bar:<30s}| {r['elapsed']:.2f}s")

    # ── Show how context flowed ───────────────────────────────────────────
    print("\n  Context flow:")
    for i, r in enumerate(results):
        content = str(r["response"].get("content", ""))
        word_count = len(content.split())
        print(f"    Stage {i+1} ({r['stage']:10s}): produced {word_count} words")
        if i < len(results) - 1:
            print(f"      └─> fed into Stage {i+2}")

    print()


if __name__ == "__main__":
    main()
