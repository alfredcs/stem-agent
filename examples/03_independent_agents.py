"""
Example 03 — Technology Landscape Scanner (Parallel Agents)

Five differentiated agents independently evaluate a technology from different
angles, executing concurrently via asyncio.gather. Each agent has a unique
caller identity and domain focus, producing complementary analysis that would
take a human analyst hours to compile.

Use case: A VP of Engineering asks "Should we adopt WebAssembly for our
backend services?" Five specialist agents investigate simultaneously.

    ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
    │  ACADEMIC       │  │  OPEN SOURCE   │  │  INDUSTRY      │
    │  RESEARCHER     │  │  SCOUT         │  │  BENCHMARKER   │
    │  (arXiv papers) │  │  (repos, libs) │  │  (perf data)   │
    └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
            │                   │                   │
    ┌───────┴────────┐  ┌──────┴─────────┐         │
    │  RISK          │  │  ADOPTION      │         │
    │  ANALYST       │  │  STRATEGIST    │         │
    │  (threats)     │  │  (roadmap)     │         │
    └───────┬────────┘  └───────┬────────┘         │
            │                   │                   │
            └───────────┬───────┘───────────────────┘
                  asyncio.gather
                  (all five in parallel)

Features demonstrated:
  - Async parallel execution with timing comparison
  - Per-agent caller profiles diverging over time
  - Async task creation and polling
  - Result aggregation from independent specialists

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

from stem_client import (
    StemAgentClient,
    print_response,
    timed,
    timing_chart,
)


# ---------------------------------------------------------------------------
# The technology evaluation question
# ---------------------------------------------------------------------------

TECHNOLOGY = "WebAssembly (Wasm) for server-side / backend workloads"

AGENTS = [
    {
        "caller_id": "scanner-academic",
        "role": "Academic Researcher",
        "focus": "academic literature & theoretical foundations",
        "task": (
            f"Survey recent academic research (2023-2025) on {TECHNOLOGY}. "
            "Cover: performance isolation guarantees, security model analysis, "
            "comparison with containers/VMs in formal settings, and any "
            "benchmarking papers. Cite specific papers with IDs."
        ),
    },
    {
        "caller_id": "scanner-opensource",
        "role": "Open Source Scout",
        "focus": "ecosystem maturity & project health",
        "task": (
            f"Evaluate the open source ecosystem for {TECHNOLOGY}. "
            "Assess: key runtimes (Wasmtime, WasmEdge, Wasmer), WASI maturity, "
            "language support (Rust, Go, C++, Python), framework integrations "
            "(Spin, Fermyon, Cosmonic), and community health metrics "
            "(stars, contributors, release cadence, production adopters)."
        ),
    },
    {
        "caller_id": "scanner-benchmarker",
        "role": "Industry Benchmarker",
        "focus": "performance & operational characteristics",
        "task": (
            f"Analyze the performance characteristics of {TECHNOLOGY}. "
            "Compare cold start times vs containers vs Lambda, throughput under "
            "load, memory overhead, CPU efficiency. Cover real-world benchmarks "
            "from Fastly, Cloudflare Workers, Fermyon. Quantify with specific "
            "numbers where possible."
        ),
    },
    {
        "caller_id": "scanner-risk",
        "role": "Risk Analyst",
        "focus": "risks, limitations & failure modes",
        "task": (
            f"Identify the key risks and limitations of adopting {TECHNOLOGY}. "
            "Cover: debugging difficulty, limited system call access (WASI gaps), "
            "ecosystem fragmentation, talent availability, vendor lock-in risk, "
            "security attack surface, and production incident case studies. "
            "Rate each risk as high/medium/low with justification."
        ),
    },
    {
        "caller_id": "scanner-strategist",
        "role": "Adoption Strategist",
        "focus": "adoption roadmap & organizational readiness",
        "task": (
            f"Design a phased adoption strategy for {TECHNOLOGY} in a "
            "mid-size engineering org (50-200 engineers, microservices "
            "architecture, currently on Kubernetes). Cover: pilot project "
            "selection criteria, team skill gaps, migration path from "
            "containers, success metrics, timeline, and go/no-go gates. "
            "Include a decision framework for which services to target first."
        ),
    },
]


async def run_agent(client: StemAgentClient, agent: dict) -> dict:
    """Run a single specialist agent asynchronously."""
    start = time.perf_counter()
    response = await client.achat(
        agent["task"],
        caller_id=agent["caller_id"],
    )
    elapsed = time.perf_counter() - start
    return {
        "name": agent["role"],
        "caller_id": agent["caller_id"],
        "focus": agent["focus"],
        "response": response,
        "elapsed": elapsed,
        "words": len(str(response.get("content", "")).split()),
    }


async def run_all_parallel(client: StemAgentClient) -> list[dict]:
    """Execute all specialist agents concurrently."""
    tasks = [run_agent(client, agent) for agent in AGENTS]
    return await asyncio.gather(*tasks)


def run_all_sequential(client: StemAgentClient) -> list[dict]:
    """Execute all agents sequentially for timing comparison."""
    results = []
    for agent in AGENTS:
        start = time.perf_counter()
        response = client.chat(agent["task"], caller_id=agent["caller_id"])
        elapsed = time.perf_counter() - start
        results.append({
            "name": agent["role"],
            "caller_id": agent["caller_id"],
            "focus": agent["focus"],
            "response": response,
            "elapsed": elapsed,
            "words": len(str(response.get("content", "")).split()),
        })
    return results


def show_aggregated_results(results: list[dict]) -> None:
    """Synthesize findings across all specialist agents."""
    print("\n" + "=" * 70)
    print("AGGREGATED INTELLIGENCE REPORT")
    print("=" * 70)
    print(f"\n  Technology: {TECHNOLOGY}")
    print(f"  Analysts:   {len(results)}")
    print(f"  Total words: {sum(r['words'] for r in results)}")
    print()

    for r in results:
        content = str(r["response"].get("content", ""))
        status = r["response"].get("status", "?")
        trace_len = len(r["response"].get("reasoningTrace") or
                        r["response"].get("reasoning_trace") or [])

        print(f"  --- {r['name']} [{r['focus']}] ---")
        print(f"      Status: {status} | {r['words']} words | "
              f"{trace_len} reasoning steps | {r['elapsed']:.1f}s")

        # Extract first 3 meaningful lines as key findings
        lines = [l.strip() for l in content.split("\n") if l.strip() and not l.strip().startswith("#")]
        for line in lines[:3]:
            print(f"      > {line[:100]}")
        print()


def show_profile_divergence(client: StemAgentClient, results: list[dict]) -> None:
    """Show how each agent's profile has diverged through specialization."""
    print("=" * 70)
    print("PROFILE DIVERGENCE (Specialization via EMA)")
    print("=" * 70)
    print()
    print("  Each caller's profile evolves with each interaction.")
    print("  Over time, profiles diverge as agents specialize.\n")

    profiles = {}
    for r in results:
        try:
            profile = client.get_profile(r["caller_id"])
            profiles[r["name"]] = profile
            style = profile.get("style", {})
            interactions = profile.get("interactionCount", 0)
            print(f"  {r['name']} ({r['caller_id']}):")
            print(f"    Interactions:    {interactions}")
            print(f"    Verbosity:       {style.get('verbosity', '?')}")
            print(f"    Technical Depth: {style.get('technicalDepth', '?')}")
            print(f"    Formality:       {style.get('formality', '?')}")
        except Exception:
            print(f"  {r['name']}: (profile not yet established)")

    print()


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("TECHNOLOGY LANDSCAPE SCANNER — Parallel Agent Intelligence")
    print("=" * 70)
    print(f"\n  Technology: {TECHNOLOGY}")
    print(f"  Agents:     {len(AGENTS)} specialists running concurrently\n")

    for agent in AGENTS:
        print(f"  [{agent['role']}] ({agent['caller_id']})")
        print(f"    Focus: {agent['focus']}")
        print(f"    Task:  {agent['task'][:80]}...")
        print()

    if not client.ensure_running():
        print("\n  [Showing task definitions — start server for live execution]\n")
        return

    # ── Parallel execution ────────────────────────────────────────────────
    print("=" * 70)
    print("PARALLEL EXECUTION")
    print("=" * 70)
    print(f"\n  Dispatching {len(AGENTS)} agents concurrently...\n")

    par_start = time.perf_counter()
    results = asyncio.run(run_all_parallel(client))
    par_total = time.perf_counter() - par_start

    for r in results:
        status = r["response"].get("status", "?")
        print(f"  [{status}] {r['name']:22s}  {r['words']:>5d} words  {r['elapsed']:.1f}s")

    # ── Timing analysis ──────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("TIMING ANALYSIS")
    print("=" * 70)

    sum_individual = sum(r["elapsed"] for r in results)
    print(f"\n  Parallel wall time:    {par_total:.2f}s")
    print(f"  Sum of individual:     {sum_individual:.2f}s")
    if par_total > 0:
        speedup = sum_individual / par_total
        print(f"  Speedup:               {speedup:.1f}x")
    print()

    timing_chart(results)

    # ── Aggregated intelligence ──────────────────────────────────────────
    show_aggregated_results(results)

    # ── Profile divergence ───────────────────────────────────────────────
    show_profile_divergence(client, results)

    # ── Async task demo ──────────────────────────────────────────────────
    print("=" * 70)
    print("ASYNC TASK: Background Synthesis")
    print("=" * 70)
    print()
    print("  For long-running analysis, use async tasks instead of blocking:")
    print()

    try:
        synthesis_msg = (
            f"Given these five independent analyses of {TECHNOLOGY}, "
            "write a single executive recommendation (go/no-go/conditional) "
            "with key conditions and timeline."
        )
        task = client.create_task(synthesis_msg)
        task_id = task.get("id") or task.get("taskId", "?")
        print(f"  Task created: {task_id}")
        print(f"  Status: {task.get('status', '?')}")
        print(f"  (This runs in the background — poll with GET /api/v1/tasks/{task_id})")
    except Exception as e:
        print(f"  (Task API not available: {e})")

    print()


if __name__ == "__main__":
    main()
