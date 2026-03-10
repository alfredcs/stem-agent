// @stem-agent/caller-layer — public API
// Layer 1: Caller/User Layer

// Framework SDK
export {
  StemAgentClient,
  type StemAgentClientOptions,
  type ChatRequest,
  type ChatResponse,
  type AgentWebSocket,
  type ToolEntry,
} from "./frameworks/sdk.js";

// A2A Client
export { A2AClient, A2AError, type A2AClientOptions } from "./agents/a2a-client.js";

// Agent Mesh
export {
  AgentRegistry,
  type AgentEntry,
  type AgentRegistryOptions,
} from "./agents/mesh.js";

// Agent Proxy
export { AgentProxy } from "./agents/agent-proxy.js";

// Collaboration Patterns
export {
  DelegationPattern,
  ConsensusPattern,
  PipelinePattern,
  type CollaborationPattern,
  type CollaborationResult,
  type Subtask,
  type PipelineStage,
} from "./agents/collaboration.js";

// CLI
export { CLI, runCLI, type CLIOptions, type HistoryEntry } from "./human/cli.js";
