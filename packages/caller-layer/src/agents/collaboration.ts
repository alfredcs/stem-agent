import type { AgentResponse } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
import type { AgentProxy } from "./agent-proxy.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollaborationResult {
  success: boolean;
  results: Array<{
    agentId: string;
    response: AgentResponse | null;
    error?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface Subtask {
  id: string;
  content: string;
  requiredCapability?: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineStage {
  agentProxy: AgentProxy;
  transform?: (previousOutput: string) => string;
}

export interface CollaborationPattern {
  name: string;
  execute(task: string, agents: AgentProxy[]): Promise<CollaborationResult>;
}

// ---------------------------------------------------------------------------
// DelegationPattern
// ---------------------------------------------------------------------------

/**
 * Decomposes a task into subtasks, assigns each to the best-fit agent
 * by capability, and executes them in parallel.
 */
export class DelegationPattern implements CollaborationPattern {
  readonly name = "delegation";
  private readonly log = createLogger("delegation-pattern");

  constructor(
    private readonly decompose: (task: string) => Subtask[],
    private readonly aggregate: (
      results: CollaborationResult["results"],
    ) => string,
  ) {}

  async execute(
    task: string,
    agents: AgentProxy[],
  ): Promise<CollaborationResult> {
    const subtasks = this.decompose(task);
    this.log.info({ subtaskCount: subtasks.length }, "decomposed task");

    const assignments = subtasks.map((sub) => {
      const match = sub.requiredCapability
        ? agents.find((a) => a.hasCapability(sub.requiredCapability!))
        : undefined;
      return { subtask: sub, agent: match ?? agents[0] };
    });

    const settled = await Promise.allSettled(
      assignments.map(async ({ subtask, agent }) => {
        const card = agent.getCard();
        const agentId = card?.agentId ?? "unknown";
        try {
          const response = await agent.sendTask(subtask.content, subtask.metadata);
          return { agentId, response, error: undefined };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.log.warn({ agentId, error: message }, "subtask failed");
          return { agentId, response: null, error: message };
        }
      }),
    );

    const results = settled.map((s) =>
      s.status === "fulfilled"
        ? s.value
        : { agentId: "unknown", response: null, error: String(s.reason) },
    );

    return {
      success: results.every((r) => r.response !== null),
      results,
      metadata: { pattern: "delegation", subtaskCount: subtasks.length },
    };
  }
}

// ---------------------------------------------------------------------------
// ConsensusPattern
// ---------------------------------------------------------------------------

/**
 * Sends the same task to all agents, extracts votes, and determines
 * whether consensus is reached based on a configurable threshold.
 */
export class ConsensusPattern implements CollaborationPattern {
  readonly name = "consensus";
  private readonly log = createLogger("consensus-pattern");
  private readonly threshold: number;
  private readonly weights: Map<string, number>;

  constructor(
    private readonly extractVote: (response: AgentResponse) => string,
    opts?: { threshold?: number; weights?: Map<string, number> },
  ) {
    this.threshold = opts?.threshold ?? 0.5;
    this.weights = opts?.weights ?? new Map();
  }

  async execute(
    task: string,
    agents: AgentProxy[],
  ): Promise<CollaborationResult> {
    const settled = await Promise.allSettled(
      agents.map(async (agent) => {
        const card = agent.getCard();
        const agentId = card?.agentId ?? "unknown";
        try {
          const response = await agent.sendTask(task);
          return { agentId, response, error: undefined };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.log.warn({ agentId, error: message }, "agent call failed");
          return { agentId, response: null, error: message };
        }
      }),
    );

    const results = settled.map((s) =>
      s.status === "fulfilled"
        ? s.value
        : { agentId: "unknown", response: null, error: String(s.reason) },
    );

    // Tally weighted votes
    const tally = new Map<string, number>();
    let totalWeight = 0;

    for (const r of results) {
      if (!r.response) continue;
      const vote = this.extractVote(r.response);
      const weight = this.weights.get(r.agentId) ?? 1;
      tally.set(vote, (tally.get(vote) ?? 0) + weight);
      totalWeight += weight;
    }

    // Find top vote
    let consensusValue: string | undefined;
    let maxWeight = 0;
    for (const [vote, weight] of tally) {
      if (weight > maxWeight) {
        maxWeight = weight;
        consensusValue = vote;
      }
    }

    const reached = totalWeight > 0 && maxWeight / totalWeight >= this.threshold;

    this.log.info(
      { votes: Object.fromEntries(tally), reached, consensusValue },
      "consensus vote complete",
    );

    return {
      success: reached,
      results,
      metadata: {
        pattern: "consensus",
        votes: Object.fromEntries(tally),
        consensusValue: reached ? consensusValue : undefined,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// PipelinePattern
// ---------------------------------------------------------------------------

/**
 * Executes a task through a sequential pipeline of agents, where each
 * stage's output feeds into the next stage.
 */
export class PipelinePattern implements CollaborationPattern {
  readonly name = "pipeline";
  private readonly log = createLogger("pipeline-pattern");

  constructor(private readonly stages: PipelineStage[]) {}

  async execute(
    task: string,
    _agents: AgentProxy[],
  ): Promise<CollaborationResult> {
    let currentInput = task;
    const results: CollaborationResult["results"] = [];

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const card = stage.agentProxy.getCard();
      const agentId = card?.agentId ?? `stage-${i}`;

      const input = stage.transform ? stage.transform(currentInput) : currentInput;

      try {
        const response = await stage.agentProxy.sendTask(input);
        results.push({ agentId, response });
        currentInput = typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.warn({ agentId, stage: i, error: message }, "pipeline stage failed");
        results.push({ agentId, response: null, error: message });

        return {
          success: false,
          results,
          metadata: { pattern: "pipeline", stagesCompleted: i },
        };
      }
    }

    return {
      success: true,
      results,
      metadata: { pattern: "pipeline", stagesCompleted: this.stages.length },
    };
  }
}
