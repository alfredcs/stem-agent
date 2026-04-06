"""
Example 05 — Adaptive DevOps Runbook Learning (Skill Lifecycle)

Demonstrates the biological skill lifecycle with a realistic DevOps scenario.
As the agent handles repeated incident types, it crystallizes reusable
resolution patterns — just as immune cells develop memory after exposure.

    ┌─────────────────────────────────────────────────────────────┐
    │                  SKILL LIFECYCLE                             │
    │                                                             │
    │  Repeated incidents → Pattern detection → Crystallization   │
    │                                                             │
    │  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
    │  │PROGENITOR│──>│COMMITTED │──>│  MATURE  │               │
    │  │(newborn) │   │(proven)  │   │(reliable)│               │
    │  └──────────┘   └──────────┘   └──────────┘               │
    │       │              │              │                       │
    │  3 activations  10 activations  Production-ready           │
    │  60%+ success   60%+ success    High-priority match        │
    │                                                             │
    │  If success < 30% after 10 activations:                    │
    │  ┌──────────┐                                              │
    │  │APOPTOSIS │  (skill removed — cell death)                │
    │  └──────────┘                                              │
    └─────────────────────────────────────────────────────────────┘

Scenario: A DevOps team uses STEM Agent for incident response.
  Phase 1: Repeated DB connection timeout incidents → auto_diagnose_db_timeout
  Phase 2: Repeated OOM kill incidents → auto_diagnose_oom_kill
  Phase 3: Unreliable prediction skill → auto_predict_traffic → apoptosis

Prerequisites:
    pip install httpx

Usage:
    python 05_skill_lifecycle.py
"""

import sys
import os
import time
import random

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response


# ---------------------------------------------------------------------------
# Simulated incident patterns
# ---------------------------------------------------------------------------

DB_TIMEOUT_INCIDENTS = [
    {
        "alert": "RDS connection pool exhausted on payment-db",
        "metrics": "active_connections: 95/100, avg_query_time: 12.3s, "
                   "slow_query_count: 47, idle_in_transaction: 23",
        "runbook_steps": [
            "Check pg_stat_activity for idle-in-transaction connections",
            "Identify long-running queries (>5s)",
            "Kill idle-in-transaction sessions >30min",
            "Check for missing indexes on slow queries",
            "Increase pool size temporarily if needed",
        ],
        "resolution": "Killed 23 idle-in-transaction sessions, identified "
                      "missing index on orders.customer_id, added index",
    },
    {
        "alert": "Connection timeout on analytics-db read replica",
        "metrics": "active_connections: 48/50, avg_query_time: 8.7s, "
                   "replication_lag: 45s, slow_query_count: 31",
        "runbook_steps": [
            "Check replication lag on read replica",
            "Check pg_stat_activity for blocking queries",
            "Reduce connection limit from analytics service",
            "Scale out additional read replica if needed",
        ],
        "resolution": "Replication lag caused by large batch job, "
                      "throttled batch queries, lag recovered in 5min",
    },
    {
        "alert": "Intermittent connection refused from user-service to user-db",
        "metrics": "active_connections: 80/100, connection_errors: 12/min, "
                   "avg_query_time: 3.2s, deadlock_count: 3",
        "runbook_steps": [
            "Check for deadlocks in pg_locks",
            "Review recent schema migrations",
            "Check connection pool configuration in user-service",
            "Verify security group rules haven't changed",
        ],
        "resolution": "Deadlocks from concurrent upserts on users table, "
                      "fixed with advisory locks in application code",
    },
]

OOM_KILL_INCIDENTS = [
    {
        "alert": "OOMKilled: recommendation-engine pod (3 restarts in 10min)",
        "metrics": "memory_limit: 4Gi, peak_usage: 4.1Gi, "
                   "heap_size: 3.8Gi, gc_pause: 850ms",
        "runbook_steps": [
            "Check container memory limits vs actual usage",
            "Analyze heap dump if available",
            "Check for memory leaks (growing RSS over time)",
            "Review recent code changes for memory-intensive operations",
            "Increase memory limit or optimize code",
        ],
        "resolution": "ML model loaded full dataset into memory for inference, "
                      "switched to streaming inference pipeline",
    },
    {
        "alert": "OOMKilled: data-pipeline pod during ETL batch job",
        "metrics": "memory_limit: 8Gi, peak_usage: 8.3Gi, "
                   "batch_size: 5M records, goroutines: 4200",
        "runbook_steps": [
            "Check if batch size has grown since last successful run",
            "Review data volume growth trends",
            "Check for goroutine leaks",
            "Reduce batch size or increase memory limit",
        ],
        "resolution": "Data volume grew 3x from new partner integration, "
                      "reduced batch size from 5M to 1M records",
    },
]

BAD_PREDICTIONS = [
    {
        "alert": "Traffic prediction: Expected 2x spike at 18:00 UTC",
        "actual": "Normal traffic, no spike observed",
        "accuracy": 0.15,
    },
    {
        "alert": "Traffic prediction: Expected 50% drop during maintenance",
        "actual": "Traffic increased 20% (users retrying)",
        "accuracy": 0.10,
    },
    {
        "alert": "Traffic prediction: Expected gradual ramp from 06:00-09:00",
        "actual": "Sharp spike at 07:30 (viral social media post)",
        "accuracy": 0.25,
    },
]


# ---------------------------------------------------------------------------
# Simulation engine
# ---------------------------------------------------------------------------

class SkillSimulator:
    """Simulates the STEM Agent skill lifecycle with realistic DevOps data."""

    def __init__(self):
        self.skills: dict[str, dict] = {}
        self.episodes: list[dict] = []

    def record_episode(self, pattern: str, incident: dict, success: bool) -> None:
        """Record an incident handling episode."""
        self.episodes.append({
            "pattern": pattern,
            "incident": incident.get("alert", ""),
            "success": success,
            "timestamp": len(self.episodes),
        })

        # Check for crystallization
        pattern_episodes = [e for e in self.episodes if e["pattern"] == pattern]
        if len(pattern_episodes) >= 3 and pattern not in self.skills:
            self._crystallize(pattern, pattern_episodes)

    def _crystallize(self, pattern: str, episodes: list[dict]) -> None:
        """Create a new progenitor skill from repeated patterns."""
        skill_name = f"auto_{pattern}"
        success_count = sum(1 for e in episodes if e["success"])
        self.skills[skill_name] = {
            "name": skill_name,
            "maturity": "progenitor",
            "activations": 0,
            "successes": 0,
            "success_rate": success_count / len(episodes),
            "source": "crystallized",
            "pattern": pattern,
        }
        print(f"\n    *** CRYSTALLIZATION: Skill '{skill_name}' created! ***")
        print(f"        Source: {len(episodes)} episodes with pattern '{pattern}'")
        print(f"        Maturity: progenitor")
        print(f"        Initial success rate: {success_count}/{len(episodes)}")

    def activate_skill(self, skill_name: str, success: bool) -> str | None:
        """Activate a skill and track maturation/apoptosis."""
        skill = self.skills.get(skill_name)
        if not skill:
            return None

        old_maturity = skill["maturity"]
        skill["activations"] += 1
        if success:
            skill["successes"] += 1
        skill["success_rate"] = skill["successes"] / skill["activations"]

        # Check maturation
        rate = skill["success_rate"]
        count = skill["activations"]

        if rate >= 0.6:
            if count >= 10 and skill["maturity"] != "mature":
                skill["maturity"] = "mature"
            elif count >= 3 and skill["maturity"] == "progenitor":
                skill["maturity"] = "committed"

        # Check apoptosis
        if count >= 10 and rate < 0.3:
            transition = f"APOPTOSIS (removed: {rate:.0%} success after {count} activations)"
            del self.skills[skill_name]
            return transition

        if skill["maturity"] != old_maturity:
            return f"MATURED: {old_maturity} → {skill['maturity']}"
        return None

    def print_skill_registry(self) -> None:
        """Display all current skills."""
        if not self.skills:
            print("    (no skills registered)")
            return
        print(f"    {'Skill':<35s} {'Maturity':<12s} {'Activations':>12s} {'Success':>10s}")
        print(f"    {'─' * 70}")
        for name, skill in self.skills.items():
            print(f"    {name:<35s} {skill['maturity']:<12s} "
                  f"{skill['activations']:>12d} {skill['success_rate']:>9.0%}")


def simulate_full_lifecycle() -> None:
    """Run the complete DevOps skill lifecycle simulation."""
    sim = SkillSimulator()

    # ── Phase 1: DB Timeout Pattern Accumulation ─────────────────────────
    print("=" * 70)
    print("PHASE 1: Database Timeout Pattern Accumulation")
    print("=" * 70)
    print()
    print("  The agent handles multiple DB connection timeout incidents.")
    print("  After 3 similar episodes, it detects a pattern and crystallizes")
    print("  a reusable diagnostic skill.\n")

    for i, incident in enumerate(DB_TIMEOUT_INCIDENTS, 1):
        print(f"  INCIDENT {i}: {incident['alert']}")
        print(f"    Metrics: {incident['metrics'][:60]}...")
        print(f"    Steps:   {len(incident['runbook_steps'])} runbook steps executed")
        print(f"    Result:  {incident['resolution'][:60]}...")

        sim.record_episode("diagnose_db_timeout", incident, success=True)
        print()

    # ── Phase 2: Skill Maturation Through Successful Use ─────────────────
    print("=" * 70)
    print("PHASE 2: Skill Maturation Through Successful Use")
    print("=" * 70)
    print()
    print("  The crystallized skill is activated for new incidents.")
    print("  Successful activations advance maturity: progenitor → committed → mature\n")

    maturation_outcomes = [
        (True, "Skill auto-diagnosed pool exhaustion → resolved in 3min"),
        (True, "Skill identified slow query → index recommendation applied"),
        (True, "Skill detected replication lag → auto-scaled read replica"),
        (False, "Skill misidentified network issue as DB problem"),
        (True, "Skill correctly diagnosed deadlock → advisory lock recommended"),
        (True, "Skill found connection leak in application code"),
        (True, "Skill detected idle-in-transaction from batch job"),
        (True, "Skill identified missing VACUUM causing bloat"),
        (True, "Skill diagnosed connection storm after deployment"),
        (True, "Skill found pg_bouncer misconfiguration"),
    ]

    for count, (success, desc) in enumerate(maturation_outcomes, 1):
        status = "OK" if success else "FAIL"
        transition = sim.activate_skill("auto_diagnose_db_timeout", success)

        line = f"    Activation {count:2d}: [{status:4s}] {desc[:55]}"
        if transition:
            line += f"\n{'':>20s}*** {transition} ***"
        print(line)

    print(f"\n  Skill Registry:")
    sim.print_skill_registry()
    print()

    # ── Phase 3: Second Pattern Emerges (OOM Kills) ──────────────────────
    print("=" * 70)
    print("PHASE 3: New Pattern Emerges (OOM Kill Incidents)")
    print("=" * 70)
    print()
    print("  A new category of incidents triggers pattern detection.\n")

    for i, incident in enumerate(OOM_KILL_INCIDENTS, 1):
        print(f"  INCIDENT {i}: {incident['alert']}")
        print(f"    Metrics: {incident['metrics'][:60]}...")
        sim.record_episode("diagnose_oom_kill", incident, success=True)
        print()

    # One more to trigger crystallization
    sim.record_episode("diagnose_oom_kill", {
        "alert": "OOMKilled: search-indexer during reindex operation"
    }, success=True)
    print()

    # Mature the OOM skill a bit
    for success in [True, True, True]:
        sim.activate_skill("auto_diagnose_oom_kill", success)

    print(f"\n  Skill Registry (two skills now):")
    sim.print_skill_registry()
    print()

    # ── Phase 4: Apoptosis (Failed Prediction Skill) ─────────────────────
    print("=" * 70)
    print("PHASE 4: Apoptosis — Removing an Unreliable Skill")
    print("=" * 70)
    print()
    print("  A traffic prediction skill was crystallized but consistently")
    print("  produces inaccurate results. After 10 activations with <30%")
    print("  success, apoptosis removes it — just as the immune system")
    print("  eliminates dysfunctional cells.\n")

    # Force-create the bad skill
    sim.skills["auto_predict_traffic"] = {
        "name": "auto_predict_traffic",
        "maturity": "progenitor",
        "activations": 0,
        "successes": 0,
        "success_rate": 0.0,
        "source": "crystallized",
        "pattern": "predict_traffic",
    }

    bad_outcomes = [
        (False, "Predicted spike, got normal traffic"),
        (True, "Correctly predicted Monday morning ramp"),
        (False, "Predicted drop, got increase from retries"),
        (False, "Missed viral event traffic spike"),
        (False, "Predicted gradual, got sudden (deploy event)"),
        (False, "Predicted 2x, actual was 0.8x"),
        (True, "Correctly predicted holiday traffic reduction"),
        (False, "Predicted steady, got saw-tooth from cron jobs"),
        (False, "Predicted peak at 18:00, actual peak at 14:00"),
        (False, "Predicted 10k RPS, actual was 45k RPS"),
    ]

    for count, (success, desc) in enumerate(bad_outcomes, 1):
        status = "OK" if success else "FAIL"
        transition = sim.activate_skill("auto_predict_traffic", success)

        line = f"    Activation {count:2d}: [{status:4s}] {desc}"
        if transition:
            line += f"\n{'':>20s}*** {transition} ***"
        print(line)

    print(f"\n  Skill Registry (after apoptosis):")
    sim.print_skill_registry()
    print()

    # ── Summary ──────────────────────────────────────────────────────────
    print("=" * 70)
    print("LIFECYCLE SUMMARY")
    print("=" * 70)
    print(f"""
  Total episodes recorded:        {len(sim.episodes)}
  Skills crystallized:            3
  Skills surviving:               {len(sim.skills)}
  Skills removed (apoptosis):     1

  Surviving Skills:""")
    sim.print_skill_registry()
    print()


def live_skill_accumulation(client: StemAgentClient) -> None:
    """Send realistic DevOps queries to trigger server-side skill learning."""
    print("=" * 70)
    print("LIVE SKILL ACCUMULATION")
    print("=" * 70)
    print()
    print("  Sending repeated incident diagnosis requests to the server.")
    print("  The agent's internal skill manager will detect patterns and")
    print("  crystallize diagnostic skills over time.\n")

    incidents = [
        (
            "Our payment-db PostgreSQL instance shows 95/100 active connections, "
            "avg query time 12.3s, and 23 idle-in-transaction sessions. "
            "The payment-gateway is returning 500s. Diagnose and suggest fixes."
        ),
        (
            "The analytics-db read replica has 45s replication lag and 48/50 "
            "connections in use. Slow query count is 31. The analytics dashboard "
            "is showing stale data. What's the root cause and fix?"
        ),
        (
            "user-service is getting intermittent 'connection refused' errors "
            "to user-db. Active connections: 80/100, 3 deadlocks detected, "
            "12 connection errors per minute. Diagnose this."
        ),
        (
            "The order-processing service has exhausted its connection pool "
            "to orders-db. Active connections at max (50/50), queue depth "
            "growing at 200/sec. No recent deploys. What should we check?"
        ),
        (
            "Batch ETL job failing with connection timeout to warehouse-db. "
            "The DB shows 90/100 connections, many from idle analytics queries. "
            "The batch job needs 20 connections but can only get 5. How to fix?"
        ),
    ]

    for i, incident in enumerate(incidents, 1):
        print(f"  Incident {i}/{len(incidents)}: {incident[:70]}...")
        response = client.chat(
            f"INCIDENT REPORT: {incident}\n\nProvide diagnosis and resolution steps.",
            caller_id="devops-skill-demo",
            metadata={"incident_type": "db_connection", "severity": "P2"},
        )
        status = response.get("status", "?")
        words = len(str(response.get("content", "")).split())
        print(f"    → [{status}] {words} words\n")

    print("  After these interactions, check the agent's skill registry:")
    print("  The 'db_connection_diagnosis' pattern should be detected.")
    print("  Use the /stem-learn skill or stem_list_skills MCP tool to verify.\n")


def main() -> None:
    client = StemAgentClient()

    print()
    print("=" * 70)
    print("ADAPTIVE DEVOPS RUNBOOK LEARNING")
    print("Skill Lifecycle: Crystallization → Maturation → Apoptosis")
    print("=" * 70)
    print()
    print("  In immunology, the adaptive immune system learns from repeated")
    print("  pathogen exposure: naive T-cells → effector cells → memory cells.")
    print("  Failed responses undergo apoptosis (programmed cell death).")
    print()
    print("  In STEM Agent, skills follow the same lifecycle:")
    print("    - Repeated patterns → skill crystallization (gene expression)")
    print("    - Successful use → maturation (progenitor → committed → mature)")
    print("    - Persistent failure → apoptosis (skill removal)")
    print()

    # Always show the simulation
    simulate_full_lifecycle()

    # Live demo if server is available
    if client.ensure_running():
        live_skill_accumulation(client)
    else:
        print("\n  [Start the server to see live skill accumulation]\n")

    print("=" * 70)
    print("KEY TAKEAWAYS")
    print("=" * 70)
    print("""
  1. Skills are NOT pre-programmed — they emerge from interaction patterns
     (like immune memory forming after pathogen exposure)

  2. The three-stage maturation (progenitor → committed → mature) ensures
     only battle-tested skills gain priority in future incident matching

  3. Apoptosis removes unreliable skills before they cause harm
     (like the immune system eliminating auto-reactive T-cells)

  4. Multiple skill families can coexist and mature independently
     (DB diagnosis, OOM analysis, etc. — like different immune cell lineages)

  5. In production, this means the agent gets BETTER at handling your
     specific infrastructure's failure modes over time — without manual
     rule writing or runbook maintenance
    """)


if __name__ == "__main__":
    main()
