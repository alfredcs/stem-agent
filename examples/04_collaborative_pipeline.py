"""
Example 04 — M&A Due Diligence Pipeline (Multi-Agent Handoff)

Six specialized agents collaborate in a sequential pipeline to produce a
startup due diligence report. Each agent passes structured output to the next,
with a quality gate at the end that can reject and trigger re-work.

This models a real advisory workflow where different specialists contribute
to a comprehensive assessment before a final reviewer signs off.

Pipeline:

    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │  MARKET  │────>│ TECHNICAL│────>│ FINANCIAL│
    │  INTEL   │     │ ASSESSOR │     │ ANALYST  │
    └──────────┘     └──────────┘     └──────────┘
         │                │                │
         v                v                v
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │   RISK   │────>│  REPORT  │────>│ SENIOR   │
    │ EVALUATOR│     │  WRITER  │     │ REVIEWER │
    └──────────┘     └──────────┘     └──────────┘
                                           │
                                      Quality Gate:
                                      score < 7 → re-run
                                      Writer stage

Features demonstrated:
  - Sequential multi-agent handoff with context accumulation
  - Metadata passing between pipeline stages
  - Quality gate with conditional re-execution
  - Pipeline timing and context flow visualization
  - Structured output requirements per stage

Prerequisites:
    pip install httpx

Usage:
    python 04_collaborative_pipeline.py
"""

import sys
import os
import time
import json

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response, timed, timing_chart


# ---------------------------------------------------------------------------
# Target company for due diligence
# ---------------------------------------------------------------------------

TARGET = {
    "company": "QuantumLeap AI",
    "sector": "Enterprise AI/ML Platform",
    "stage": "Series B ($45M raised, seeking $120M Series C)",
    "founded": "2021",
    "employees": "~180",
    "revenue": "$22M ARR (2024), up from $8M ARR (2023)",
    "key_product": (
        "AutoML platform that generates production-ready ML pipelines from "
        "natural language descriptions. Targets mid-market enterprises."
    ),
    "tech_stack": "Python, Kubernetes, Ray, PyTorch, PostgreSQL, React",
    "customers": "~85 enterprise customers, 3 Fortune 500",
    "competitors": "DataRobot, H2O.ai, Google AutoML, AWS SageMaker Autopilot",
}


def format_target_brief() -> str:
    """Format the target company info as a structured brief."""
    lines = ["TARGET COMPANY BRIEF:"]
    for key, val in TARGET.items():
        label = key.replace("_", " ").title()
        lines.append(f"  {label}: {val}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Pipeline stage definitions
# ---------------------------------------------------------------------------

STAGES = [
    {
        "name": "Market Intel",
        "caller_id": "dd-market-intel",
        "prompt_template": (
            "You are a Market Intelligence Analyst conducting due diligence.\n\n"
            "{target_brief}\n\n"
            "Produce a structured market analysis covering:\n"
            "1. Total Addressable Market (TAM/SAM/SOM) for enterprise AutoML\n"
            "2. Market growth rate and key drivers\n"
            "3. Competitive landscape (direct + adjacent competitors)\n"
            "4. Market positioning and differentiation assessment\n"
            "5. Customer concentration risk\n\n"
            "Cite specific market data where possible. Be precise with numbers."
        ),
    },
    {
        "name": "Technical Assessor",
        "caller_id": "dd-tech-assessor",
        "prompt_template": (
            "You are a Technical Due Diligence Lead.\n\n"
            "{target_brief}\n\n"
            "Market Context:\n{previous_output}\n\n"
            "Assess the technical foundations:\n"
            "1. Architecture evaluation (scalability, reliability, security)\n"
            "2. Technology stack modernity and talent availability\n"
            "3. IP and defensibility (patents, proprietary algorithms, moat)\n"
            "4. Technical debt indicators and red flags\n"
            "5. Infrastructure costs and scaling trajectory\n"
            "6. AI/ML model quality and benchmarking methodology\n\n"
            "Rate each area: Strong / Adequate / Concerning / Red Flag"
        ),
    },
    {
        "name": "Financial Analyst",
        "caller_id": "dd-financial",
        "prompt_template": (
            "You are a Financial Analyst performing due diligence.\n\n"
            "{target_brief}\n\n"
            "Technical Assessment:\n{previous_output}\n\n"
            "Analyze financial health and projections:\n"
            "1. Revenue trajectory and growth sustainability (175% YoY)\n"
            "2. Unit economics (CAC, LTV, LTV:CAC ratio, payback period)\n"
            "3. Gross margin analysis for an ML platform business\n"
            "4. Burn rate and runway estimation\n"
            "5. Valuation benchmarking against public and private comps\n"
            "6. Key financial risks and sensitivities\n\n"
            "Use the $120M Series C target as context for valuation analysis."
        ),
    },
    {
        "name": "Risk Evaluator",
        "caller_id": "dd-risk",
        "prompt_template": (
            "You are a Risk Assessment Specialist.\n\n"
            "{target_brief}\n\n"
            "Financial Analysis:\n{previous_output}\n\n"
            "Produce a comprehensive risk register:\n"
            "1. Market risks (competition, commoditization, market timing)\n"
            "2. Technology risks (obsolescence, GenAI disruption, scaling)\n"
            "3. Execution risks (team, hiring, go-to-market)\n"
            "4. Financial risks (burn, revenue concentration, macro)\n"
            "5. Regulatory risks (AI regulation, data privacy, EU AI Act)\n\n"
            "For each risk: describe, rate (Critical/High/Medium/Low), and "
            "suggest mitigation. Provide an overall risk score (1-10)."
        ),
    },
    {
        "name": "Report Writer",
        "caller_id": "dd-writer",
        "prompt_template": (
            "You are an Investment Report Writer.\n\n"
            "{target_brief}\n\n"
            "Risk Assessment:\n{previous_output}\n\n"
            "Write a concise executive due diligence summary (400-500 words) "
            "structured as:\n"
            "  - Executive Summary (2-3 sentences)\n"
            "  - Investment Thesis (bull case)\n"
            "  - Key Risks (bear case)\n"
            "  - Valuation Assessment\n"
            "  - Recommendation (Invest / Pass / Conditional with terms)\n\n"
            "Write for a senior investment committee. Be direct and specific."
        ),
    },
    {
        "name": "Senior Reviewer",
        "caller_id": "dd-reviewer",
        "prompt_template": (
            "You are a Senior Managing Director reviewing a due diligence report.\n\n"
            "Report:\n{previous_output}\n\n"
            "Review for:\n"
            "1. Logical consistency between findings and recommendation\n"
            "2. Missing analysis or blind spots\n"
            "3. Unsupported claims or over/under-estimation of risks\n"
            "4. Actionable specificity of recommendation\n\n"
            "Provide:\n"
            "  - Quality Score: [1-10] with brief justification\n"
            "  - Verdict: APPROVE / REVISE / REJECT\n"
            "  - Specific feedback points (if REVISE or REJECT)\n\n"
            "Be rigorous. A score below 7 means the report needs revision."
        ),
    },
]


def run_pipeline(client: StemAgentClient, max_rewrites: int = 2) -> list[dict]:
    """Execute the due diligence pipeline with quality gate."""
    results = []
    previous_output = ""
    target_brief = format_target_brief()

    for stage_idx, stage in enumerate(STAGES):
        prompt = stage["prompt_template"].format(
            target_brief=target_brief,
            previous_output=previous_output,
        )

        # Stage metadata for traceability
        metadata = {
            "pipeline": "due_diligence",
            "stage": stage["name"],
            "stage_index": stage_idx,
            "target": TARGET["company"],
        }

        print(f"\n  [{stage['name'].upper():^16s}] → {stage['caller_id']}")
        print(f"  {'─' * 50}")

        start = time.perf_counter()
        response = client.chat(
            prompt,
            caller_id=stage["caller_id"],
            metadata=metadata,
        )
        elapsed = time.perf_counter() - start

        content = str(response.get("content", ""))
        status = response.get("status", "?")
        words = len(content.split())
        trace_len = len(response.get("reasoningTrace") or
                        response.get("reasoning_trace") or [])

        result = {
            "name": stage["name"],
            "caller_id": stage["caller_id"],
            "response": response,
            "elapsed": elapsed,
            "words": words,
        }
        results.append(result)

        print(f"  Status: {status} | {words} words | "
              f"{trace_len} reasoning steps | {elapsed:.1f}s")
        print(f"  Preview: {content[:200]}...")

        previous_output = content

        # Quality gate: Senior Reviewer can trigger re-work
        if stage["name"] == "Senior Reviewer" and max_rewrites > 0:
            verdict = _extract_verdict(content)
            score = _extract_score(content)

            print(f"\n  QUALITY GATE:")
            print(f"    Score:   {score}/10")
            print(f"    Verdict: {verdict}")

            if verdict == "REVISE" and score < 7:
                print(f"    → Report needs revision. Re-running Writer stage...")
                print(f"    (Rewrites remaining: {max_rewrites - 1})")

                # Re-run the Writer stage with reviewer feedback
                rewrite_prompt = (
                    f"REVISION REQUIRED. The Senior Reviewer scored your report "
                    f"{score}/10 and requested revisions.\n\n"
                    f"Reviewer feedback:\n{content}\n\n"
                    f"Original report to revise:\n{results[-2]['response'].get('content', '')}\n\n"
                    "Rewrite the executive summary addressing ALL feedback points."
                )

                start = time.perf_counter()
                rewrite_resp = client.chat(
                    rewrite_prompt,
                    caller_id="dd-writer",
                    metadata={**metadata, "stage": "Report Writer (revision)"},
                )
                rewrite_elapsed = time.perf_counter() - start

                rewrite_content = str(rewrite_resp.get("content", ""))
                results.append({
                    "name": "Report Writer (revision)",
                    "caller_id": "dd-writer",
                    "response": rewrite_resp,
                    "elapsed": rewrite_elapsed,
                    "words": len(rewrite_content.split()),
                })

                print(f"\n  [REPORT WRITER (REVISION)]")
                print(f"  {rewrite_content[:200]}...")

    return results


def _extract_verdict(content: str) -> str:
    """Extract verdict from reviewer output."""
    content_upper = content.upper()
    for v in ["APPROVE", "REVISE", "REJECT"]:
        if v in content_upper:
            return v
    return "UNKNOWN"


def _extract_score(content: str) -> int:
    """Extract quality score from reviewer output."""
    import re
    patterns = [
        r'(?:score|quality)[:\s]*(\d+)\s*/\s*10',
        r'(\d+)\s*/\s*10',
        r'(?:score|quality)[:\s]*(\d+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            score = int(match.group(1))
            if 1 <= score <= 10:
                return score
    return 5  # Default middle score if not parseable


def main() -> None:
    client = StemAgentClient()

    print("=" * 70)
    print("M&A DUE DILIGENCE PIPELINE — Multi-Agent Collaborative Report")
    print("=" * 70)
    print()

    # Show target company
    print("  TARGET COMPANY:")
    for key, val in TARGET.items():
        label = key.replace("_", " ").title()
        print(f"    {label:15s}: {val}")
    print()

    # Show pipeline
    print("  PIPELINE:")
    for i, stage in enumerate(STAGES, 1):
        arrow = " → " if i < len(STAGES) else " → [DONE]"
        print(f"    {i}. {stage['name']:<18s} ({stage['caller_id']}){arrow}")
    print()
    print("  QUALITY GATE: Senior Reviewer can reject reports scoring < 7/10")
    print("  and trigger a re-write of the Report Writer stage.\n")

    if not client.ensure_running():
        print("  [Server not running — showing pipeline structure only]\n")
        return

    # Execute pipeline
    print("=" * 70)
    print("EXECUTING PIPELINE")
    print("=" * 70)

    overall_start = time.perf_counter()
    results = run_pipeline(client)
    overall_elapsed = time.perf_counter() - overall_start

    # Summary
    print("\n" + "=" * 70)
    print("PIPELINE SUMMARY")
    print("=" * 70)
    print(f"\n  Target:       {TARGET['company']}")
    print(f"  Stages:       {len(results)} (including any revisions)")
    print(f"  Total time:   {overall_elapsed:.2f}s")
    print(f"  Total words:  {sum(r['words'] for r in results)}")

    # Timing chart
    print("\n  Stage Timing:")
    timing_chart(results)

    # Context flow
    print("\n  Context Flow:")
    for i, r in enumerate(results):
        next_stage = results[i + 1]["name"] if i < len(results) - 1 else "[Final Output]"
        print(f"    {r['name']:22s} → {r['words']:>5d} words → {next_stage}")

    # Pipeline efficiency
    print(f"\n  Pipeline Stats:")
    avg_time = overall_elapsed / len(results)
    avg_words = sum(r["words"] for r in results) / len(results)
    print(f"    Avg stage time:    {avg_time:.1f}s")
    print(f"    Avg stage output:  {avg_words:.0f} words")
    print(f"    Context expansion: {results[-1]['words'] / max(results[0]['words'], 1):.1f}x "
          f"(first → last stage)")

    # Show final output
    final = results[-1]
    print(f"\n  FINAL OUTPUT ({final['name']}):")
    print(f"  {'─' * 50}")
    content = str(final["response"].get("content", ""))
    for line in content.split("\n")[:20]:
        print(f"    {line}")
    if len(content.split("\n")) > 20:
        print(f"    ... ({len(content.split(chr(10)))} total lines)")

    print()


if __name__ == "__main__":
    main()
