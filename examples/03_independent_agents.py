"""
Example 03 — Independent Agents (Parallel Execution)

Multiple differentiated agents work independently on domain-specific tasks,
executing in parallel via asyncio. Each agent has its own caller identity,
demonstrating how a single server can serve multiple specialized agents.

    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │  Research Agent  │   │  Analysis Agent  │   │  Creative Agent  │
    │  (arXiv search)  │   │  (data insights) │   │  (science comm)  │
    └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
             │                     │                     │
             └─────────────┬───────┘─────────────────────┘
                     asyncio.gather
                     (parallel execution)

Prerequisites:
    pip install httpx

Usage:
    python 03_independent_agents.py
"""

import asyncio
import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response, timed


# ---------------------------------------------------------------------------
# Define independent agent tasks
# ---------------------------------------------------------------------------

AGENTS = [
    {
        "caller_id": "agent-researcher",
        "role": "Research Agent",
        "task": (
            "What are the most significant recent advances in large language model "
            "agents for scientific discovery? Summarize the key approaches."
        ),
    },
    {
        "caller_id": "agent-analyst",
        "role": "Analysis Agent",
        "task": (
            "Compare the trade-offs between transformer-based and diffusion-based "
            "architectures for generative AI. What are the strengths of each?"
        ),
    },
    {
        "caller_id": "agent-writer",
        "role": "Creative Agent",
        "task": (
            "Explain quantum entanglement to a curious 12-year-old using a "
            "creative analogy. Make it engaging and scientifically accurate."
        ),
    },
]


async def run_agent(client: StemAgentClient, agent: dict) -> dict:
    """Run a single agent task asynchronously."""
    start = time.perf_counter()
    response = await client.achat(
        agent["task"],
        caller_id=agent["caller_id"],
    )
    elapsed = time.perf_counter() - start
    return {
        "role": agent["role"],
        "caller_id": agent["caller_id"],
        "response": response,
        "elapsed": elapsed,
    }


async def run_all_parallel(client: StemAgentClient) -> list[dict]:
    """Execute all agent tasks concurrently."""
    tasks = [run_agent(client, agent) for agent in AGENTS]
    return await asyncio.gather(*tasks)


def run_all_sequential(client: StemAgentClient) -> list[dict]:
    """Execute all agent tasks sequentially for timing comparison."""
    results = []
    for agent in AGENTS:
        start = time.perf_counter()
        response = client.chat(agent["task"], caller_id=agent["caller_id"])
        elapsed = time.perf_counter() - start
        results.append({
            "role": agent["role"],
            "caller_id": agent["caller_id"],
            "response": response,
            "elapsed": elapsed,
        })
    return results


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("INDEPENDENT AGENTS — Parallel Execution")
    print("=" * 70)
    print()
    print("  Three specialized agents work independently on different tasks.")
    print("  Each has its own caller identity and domain context.")
    print()

    if not client.ensure_running():
        print("\n  [Showing task definitions — start server for live execution]\n")
        for agent in AGENTS:
            print(f"  {agent['role']} ({agent['caller_id']}):")
            print(f"    Task: {agent['task'][:80]}...")
            print()
        return

    # ── Parallel execution ────────────────────────────────────────────────
    print("Running all agents in parallel...\n")
    par_start = time.perf_counter()
    results = asyncio.run(run_all_parallel(client))
    par_total = time.perf_counter() - par_start

    for r in results:
        print(f"--- {r['role']} ({r['caller_id']}) [{r['elapsed']:.2f}s] ---")
        print_response(r["response"], show_trace=False)

    # ── Timing summary ────────────────────────────────────────────────────
    print("=" * 70)
    print("TIMING SUMMARY")
    print("=" * 70)

    sum_individual = sum(r["elapsed"] for r in results)
    print(f"\n  Parallel wall time:    {par_total:.2f}s")
    print(f"  Sum of individual:     {sum_individual:.2f}s")
    if sum_individual > 0:
        speedup = sum_individual / par_total
        print(f"  Speedup:               {speedup:.1f}x")
    print()

    for r in results:
        bar_len = int(r["elapsed"] * 10)
        bar = "#" * bar_len
        print(f"    {r['role']:20s} |{bar:<30s}| {r['elapsed']:.2f}s")

    # ── Caller profiles ───────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("CALLER PROFILES (adapted from interactions)")
    print("=" * 70)
    print()

    for agent in AGENTS:
        try:
            profile = client.get_profile(agent["caller_id"])
            interactions = profile.get("interactionCount", 0)
            print(f"  {agent['caller_id']}: {interactions} interaction(s)")
        except Exception:
            print(f"  {agent['caller_id']}: (no profile yet)")

    print()
    print("  Each agent's profile will adapt over time based on its")
    print("  interaction patterns, enabling personalized behavior.\n")


if __name__ == "__main__":
    main()
