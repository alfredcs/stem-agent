// @stem-agent/caller-layer — public API
// Layer 1: Caller/User Layer
// Framework SDK
export { StemAgentClient, } from "./frameworks/sdk.js";
// A2A Client
export { A2AClient, A2AError } from "./agents/a2a-client.js";
// Agent Mesh
export { AgentRegistry, } from "./agents/mesh.js";
// Agent Proxy
export { AgentProxy } from "./agents/agent-proxy.js";
// Collaboration Patterns
export { DelegationPattern, ConsensusPattern, PipelinePattern, } from "./agents/collaboration.js";
// CLI
export { CLI, runCLI } from "./human/cli.js";
//# sourceMappingURL=index.js.map