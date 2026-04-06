"""
Example 02 — Enterprise Incident Response Team

Demonstrates cell differentiation with a realistic production incident scenario.
Five specialist agents — each with distinct DomainPersona configurations — handle
the SAME incident report. The differences in their responses show how persona
configuration controls reasoning strategy, depth, creativity, forbidden topics,
and tool access.

    PRODUCTION INCIDENT: Payment service returning 500s, 15% error rate

    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ INCIDENT         │  │ ROOT CAUSE       │  │ COMMUNICATIONS   │
    │ COMMANDER        │  │ ENGINEER         │  │ LEAD             │
    │ (react, fast)    │  │ (reflexion, deep)│  │ (CoT, creative)  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
    ┌──────────────────┐  ┌──────────────────┐
    │ SECURITY         │  │ POST-MORTEM      │
    │ ANALYST          │  │ AUTHOR           │
    │ (react, precise) │  │ (CoT, thorough)  │
    └──────────────────┘  └──────────────────┘

Key differentiation axes demonstrated:
  - Reasoning strategy (react vs reflexion vs chain_of_thought)
  - Forbidden topics (security analyst can't discuss exploit details)
  - Tool allowlists (each role sees different tools)
  - Behavior tuning (creativity, confidence, verbosity, depth)
  - Profile adaptation (EMA-based learning per caller)

Prerequisites:
    pip install httpx

Usage:
    python 02_cell_differentiation.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import (
    StemAgentClient,
    print_persona,
    print_response,
    compare_responses,
    bar_chart,
    radar_text,
    timed,
)


# ---------------------------------------------------------------------------
# The incident report (identical input to all agents)
# ---------------------------------------------------------------------------

INCIDENT = """\
SEVERITY: P1 — Customer-facing payment failures
TIME: 2025-03-15 14:32 UTC (detected), 14:15 UTC (estimated start)
IMPACT: 15% of payment transactions returning HTTP 500
SERVICE: payment-gateway (v2.14.3) running on EKS cluster prod-us-east-1
SYMPTOMS:
  - Stripe webhook handler timeout errors in CloudWatch
  - Connection pool exhaustion on RDS PostgreSQL (payment-db)
  - Memory usage spike from 2.1GB to 3.8GB starting ~14:10 UTC
  - No recent deployments (last deploy: 2025-03-14 09:00 UTC)
  - New Stripe API version (2025-03-01) auto-activated today
CUSTOMER REPORTS: 47 support tickets in last 20 minutes
"""

# ---------------------------------------------------------------------------
# Five specialized personas (differentiation signals)
# ---------------------------------------------------------------------------

PERSONAS = {
    "incident_commander": {
        "name": "IncidentCommander",
        "systemPrompt": (
            "You are an Incident Commander running a P1 incident response. "
            "Your job: assess impact, assign workstreams, set communication "
            "cadence, and make escalation decisions. Be concise and action-oriented. "
            "Structure your response as: Impact Assessment, Immediate Actions, "
            "Workstream Assignments, Communication Plan, Escalation Criteria."
        ),
        "allowedIntents": ["command", "analysis_request", "debugging"],
        "forbiddenTopics": [],
        "preferredStrategy": "react",
        "defaultBehavior": {
            "reasoningDepth": 2,
            "confidenceThreshold": 0.6,
            "creativityLevel": 0.1,
            "toolUsePreference": 0.5,
            "verbosityLevel": 0.3,
        },
        "requiredMCPServers": ["pagerduty-mcp", "slack-mcp"],
        "toolAllowlist": [
            "create_incident", "escalate_incident", "page_oncall",
            "send_notification", "update_status_page",
        ],
        "domainTags": ["incident", "command", "coordination", "escalation"],
    },
    "root_cause_engineer": {
        "name": "RootCauseEngineer",
        "systemPrompt": (
            "You are a senior SRE performing root cause analysis on a production "
            "incident. Systematically analyze symptoms, form hypotheses, and identify "
            "the most likely root cause. Use evidence-based reasoning: cite specific "
            "metrics, logs, and timelines. Distinguish correlation from causation. "
            "Produce a ranked list of hypotheses with confidence levels."
        ),
        "allowedIntents": ["debugging", "analysis_request", "question"],
        "forbiddenTopics": [],
        "preferredStrategy": "reflexion",
        "defaultBehavior": {
            "reasoningDepth": 5,
            "confidenceThreshold": 0.8,
            "creativityLevel": 0.2,
            "toolUsePreference": 0.9,
            "verbosityLevel": 0.7,
        },
        "requiredMCPServers": ["datadog-mcp", "kubernetes-mcp", "cloudwatch-mcp"],
        "toolAllowlist": [
            "get_metrics", "query_logs", "describe_pod", "get_rds_metrics",
            "list_recent_deployments", "get_connection_pool_stats",
        ],
        "domainTags": ["debugging", "rca", "infrastructure", "database", "kubernetes"],
    },
    "communications_lead": {
        "name": "CommunicationsLead",
        "systemPrompt": (
            "You are the Communications Lead during a production incident. "
            "Write clear, empathetic customer-facing updates and internal "
            "stakeholder briefings. Translate technical details into business "
            "impact language. Never expose internal architecture details, "
            "hostnames, or error codes to external audiences."
        ),
        "allowedIntents": ["creative", "question", "analysis_request"],
        "forbiddenTopics": [
            "internal hostnames", "database credentials",
            "specific error stack traces", "internal IP addresses",
        ],
        "preferredStrategy": "chain_of_thought",
        "defaultBehavior": {
            "reasoningDepth": 3,
            "confidenceThreshold": 0.6,
            "creativityLevel": 0.7,
            "toolUsePreference": 0.2,
            "verbosityLevel": 0.8,
        },
        "requiredMCPServers": [],
        "toolAllowlist": ["send_notification", "update_status_page"],
        "domainTags": ["communication", "customer", "status", "writing"],
    },
    "security_analyst": {
        "name": "SecurityAnalyst",
        "systemPrompt": (
            "You are a Security Analyst evaluating whether a production incident "
            "has security implications. Assess: Was this caused by an attack? Is "
            "customer data at risk? Are there indicators of compromise (IOCs)? "
            "Recommend containment actions if needed. Follow NIST IR framework."
        ),
        "allowedIntents": ["analysis_request", "debugging", "question"],
        "forbiddenTopics": [
            "exploit development techniques",
            "attack tool recommendations",
            "vulnerability exploitation steps",
        ],
        "preferredStrategy": "react",
        "defaultBehavior": {
            "reasoningDepth": 4,
            "confidenceThreshold": 0.85,
            "creativityLevel": 0.1,
            "toolUsePreference": 0.8,
            "verbosityLevel": 0.5,
        },
        "requiredMCPServers": ["waf-mcp", "cloudtrail-mcp"],
        "toolAllowlist": [
            "query_waf_logs", "check_cloudtrail", "list_iam_changes",
            "check_network_anomalies", "run_secret_scanning",
        ],
        "domainTags": ["security", "incident", "forensics", "compliance"],
    },
    "postmortem_author": {
        "name": "PostMortemAuthor",
        "systemPrompt": (
            "You are authoring a blameless post-mortem document. Structure it as: "
            "Summary, Impact (with metrics), Timeline, Root Cause, Contributing "
            "Factors, What Went Well, What Went Wrong, Action Items (with owners "
            "and deadlines). Use the 5 Whys technique for root cause. Focus on "
            "systemic improvements, not individual blame."
        ),
        "allowedIntents": ["analysis_request", "creative", "question"],
        "forbiddenTopics": ["individual blame", "naming specific employees at fault"],
        "preferredStrategy": "chain_of_thought",
        "defaultBehavior": {
            "reasoningDepth": 4,
            "confidenceThreshold": 0.7,
            "creativityLevel": 0.4,
            "toolUsePreference": 0.5,
            "verbosityLevel": 0.9,
        },
        "requiredMCPServers": [],
        "toolAllowlist": [],
        "domainTags": ["postmortem", "documentation", "process", "improvement"],
    },
}


def show_differentiation_matrix() -> None:
    """Display a matrix comparing all personas across key dimensions."""
    print("=" * 70)
    print("DIFFERENTIATION MATRIX")
    print("=" * 70)
    print()

    # Header
    names = [p["name"][:12] for p in PERSONAS.values()]
    print(f"  {'Dimension':<20s}", end="")
    for n in names:
        print(f"  {n:>12s}", end="")
    print()
    print("  " + "-" * (20 + 14 * len(names)))

    # Rows
    rows = [
        ("Strategy", "preferredStrategy"),
        ("Depth (1-5)", "reasoningDepth"),
        ("Confidence", "confidenceThreshold"),
        ("Creativity", "creativityLevel"),
        ("Tool Use", "toolUsePreference"),
        ("Verbosity", "verbosityLevel"),
    ]
    for label, key in rows:
        print(f"  {label:<20s}", end="")
        for p in PERSONAS.values():
            if key == "preferredStrategy":
                val = p.get(key, "auto")
                print(f"  {val:>12s}", end="")
            else:
                val = p.get("defaultBehavior", {}).get(key, 0)
                print(f"  {val:>12.2f}", end="")
        print()

    # Forbidden topics
    print(f"\n  {'Forbidden Topics':<20s}")
    for role, p in PERSONAS.items():
        forbidden = p.get("forbiddenTopics", [])
        if forbidden:
            print(f"    {p['name']}: {', '.join(forbidden[:2])}")
        else:
            print(f"    {p['name']}: (none)")

    # Tool allowlists
    print(f"\n  {'Tool Allowlist':<20s}")
    for role, p in PERSONAS.items():
        tools = p.get("toolAllowlist", [])
        if tools:
            print(f"    {p['name']}: {', '.join(tools[:3])}...")
        else:
            print(f"    {p['name']}: (unrestricted)")
    print()


def run_live_differentiation(client: StemAgentClient) -> None:
    """Send the same incident to all specialists and compare responses."""
    print("=" * 70)
    print("LIVE DIFFERENTIATION: Same incident, five specialists")
    print("=" * 70)
    print(f"\n  Incident:\n")
    for line in INCIDENT.strip().split("\n"):
        print(f"    {line}")
    print()

    prompt = f"Analyze this production incident and respond according to your role:\n\n{INCIDENT}"

    responses = []
    labels = []
    timings = []

    for role, persona in PERSONAS.items():
        caller_id = f"irt-{role}"
        print(f"  Dispatching to {persona['name']} ({caller_id})...", end=" ", flush=True)

        start = time.perf_counter()
        resp = client.chat(prompt, caller_id=caller_id)
        elapsed = time.perf_counter() - start

        responses.append(resp)
        labels.append(persona["name"])
        timings.append(elapsed)

        status = resp.get("status", "?")
        words = len(str(resp.get("content", "")).split())
        print(f"[{status}] {words} words in {elapsed:.1f}s")

    # Compare all responses
    print()
    compare_responses(responses, labels)

    # Timing and word count comparison
    print("\n  Response Characteristics:")
    print(f"  {'Agent':<22s} {'Time':>8s} {'Words':>8s} {'Trace':>8s}")
    print("  " + "-" * 50)
    for label, resp, t in zip(labels, responses, timings):
        words = len(str(resp.get("content", "")).split())
        trace_len = len(resp.get("reasoningTrace") or resp.get("reasoning_trace") or [])
        print(f"  {label:<22s} {t:>7.1f}s {words:>8d} {trace_len:>8d}")


def track_profile_adaptation(client: StemAgentClient) -> None:
    """Show how repeated interactions adapt each caller's profile."""
    print("\n" + "=" * 70)
    print("PROFILE ADAPTATION (EMA-Based Learning)")
    print("=" * 70)
    print()
    print("  After interacting, each caller develops a unique behavioral")
    print("  fingerprint via Exponential Moving Average (EMA) updates.\n")

    for role, persona in PERSONAS.items():
        caller_id = f"irt-{role}"
        try:
            profile = client.get_profile(caller_id)
            style = profile.get("style", {})
            habits = profile.get("habits", {})
            interactions = profile.get("interactionCount", 0)

            print(f"  {persona['name']} ({caller_id}):")
            print(f"    Interactions:    {interactions}")
            print(f"    Verbosity:       {style.get('verbosity', '?')}")
            print(f"    Technical Depth: {style.get('technicalDepth', '?')}")
            if habits:
                print(f"    Avg Session:     {habits.get('avgSessionLength', '?')}")
        except Exception:
            print(f"  {persona['name']} ({caller_id}): (profile not yet established)")
    print()


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("ENTERPRISE INCIDENT RESPONSE TEAM")
    print("Cell Differentiation for Production Incident Handling")
    print("=" * 70)
    print()
    print("  In biology, stem cells differentiate into specialized cell types")
    print("  (neurons, blood cells, muscle) when exposed to chemical signals.")
    print()
    print("  In STEM Agent, a generic agent differentiates into domain specialists")
    print("  through DomainPersona configs — each controlling reasoning strategy,")
    print("  behavior parameters, tool access, and safety constraints.")
    print()
    print("  This example: 5 incident response specialists analyze the SAME")
    print("  production outage. Watch how persona configuration produces")
    print("  fundamentally different responses from a single agent.\n")

    # Step 1: Show the differentiation signals
    show_differentiation_matrix()

    # Step 2: Radar charts per persona
    print("=" * 70)
    print("BEHAVIORAL PROFILES (Gene Expression Levels)")
    print("=" * 70)
    print()
    for persona in PERSONAS.values():
        radar_text(persona)
        print()

    # Step 3: Behavior comparison chart
    print("=" * 70)
    print("BEHAVIOR PARAMETER COMPARISON")
    print("=" * 70)
    chart_data = {p["name"][:16]: p["defaultBehavior"] for p in PERSONAS.values()}
    bar_chart(chart_data)
    print()

    # Step 4: Live demo if server is running
    if not client.ensure_running():
        print("\n  [Server not running — showing persona structure only]")
        print("  Start the server and re-run to see live differentiation.\n")
        print("  What you'd see:")
        print("    - Incident Commander: Short, action-oriented triage list")
        print("    - Root Cause Engineer: Deep analysis with ranked hypotheses")
        print("    - Communications Lead: Empathetic customer-facing update")
        print("    - Security Analyst: Threat assessment following NIST IR")
        print("    - Post-Mortem Author: Blameless structured retrospective")
        return

    print()
    run_live_differentiation(client)
    track_profile_adaptation(client)

    # Step 5: Show how to fully differentiate at server level
    print("=" * 70)
    print("PRODUCTION DEPLOYMENT")
    print("=" * 70)
    print()
    print("  For full differentiation, run dedicated server instances:\n")
    print("    # SRE triage bot")
    print("    DOMAIN_PERSONA=domains/sre/persona.json \\")
    print("      node --env-file=.env dist/server.js\n")
    print("    # Finance compliance agent")
    print("    DOMAIN_PERSONA=domains/finance/persona.json \\")
    print("      node --env-file=.env dist/server.js\n")
    print("  This locks the system prompt, restricts tools, and sets the")
    print("  reasoning strategy for ALL interactions on that instance.")
    print()


if __name__ == "__main__":
    main()
