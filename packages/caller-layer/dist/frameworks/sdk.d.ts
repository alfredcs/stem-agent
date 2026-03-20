import type { AgentCard, AgentResponse, BehaviorParameters, CallerProfile } from "@stem-agent/shared";
import { type Logger } from "@stem-agent/shared";
/** Options for constructing a {@link StemAgentClient}. */
export interface StemAgentClientOptions {
    /** Base HTTP URL of the STEM agent (e.g. `http://localhost:8000`). */
    baseUrl: string;
    /** Override WebSocket URL. Defaults to baseUrl with ws(s):// scheme + `/ws`. */
    wsUrl?: string;
    /** Optional API key sent as `X-API-Key` header. */
    apiKey?: string;
    /** Extra headers merged into every request. */
    headers?: Record<string, string>;
    /** Injected logger. Falls back to a default pino logger. */
    logger?: Logger;
}
/** Payload sent to the chat endpoints. */
export interface ChatRequest {
    message: string;
    callerId?: string;
    sessionId?: string;
}
/** Shape returned by the REST chat endpoint. */
export interface ChatResponse {
    task_id: string;
    status: string;
    content: unknown;
    reasoning_trace?: string[];
}
/** Typed wrapper around a WebSocket connection to the agent. */
export interface AgentWebSocket {
    /** Send a chat message over the open socket. */
    send(msg: ChatRequest): void;
    /** Async iterator yielding responses as they arrive. */
    messages(): AsyncIterable<ChatResponse>;
    /** Close the underlying socket. */
    close(): void;
}
/** Tool entry returned by `/api/v1/mcp/tools`. */
export interface ToolEntry {
    name: string;
    description: string;
}
/**
 * High-level TypeScript client for the STEM Agent REST + WebSocket APIs.
 *
 * @example
 * ```ts
 * const client = new StemAgentClient({ baseUrl: "http://localhost:8000" });
 * const res = await client.chat({ message: "Hello" });
 * console.log(res.content);
 * ```
 */
export declare class StemAgentClient {
    private readonly baseUrl;
    private readonly wsUrl;
    private readonly defaultHeaders;
    private readonly log;
    private activeSockets;
    constructor(opts: StemAgentClientOptions);
    private request;
    /**
     * Send a chat message and receive the full response.
     * Maps to `POST /api/v1/chat`.
     */
    chat(req: ChatRequest): Promise<ChatResponse>;
    /**
     * Send a chat message and stream partial responses via SSE.
     * Maps to `POST /api/v1/chat/stream`.
     */
    chatStream(req: ChatRequest): AsyncIterable<AgentResponse>;
    /**
     * Open a WebSocket connection to the agent.
     * Maps to `GET /ws`.
     */
    connectWebSocket(token?: string): AgentWebSocket;
    /**
     * Fetch the A2A agent card.
     * Maps to `GET /.well-known/agent.json`.
     */
    getAgentCard(): Promise<AgentCard>;
    /**
     * Fetch the learned caller profile.
     * Maps to `GET /api/v1/profile/:id`.
     */
    getCallerProfile(callerId: string): Promise<CallerProfile>;
    /**
     * Fetch current self-adapted behavior parameters.
     * Maps to `GET /api/v1/behavior`.
     */
    getBehaviorParams(): Promise<BehaviorParameters>;
    /**
     * List all available MCP tools.
     * Maps to `GET /api/v1/mcp/tools`.
     */
    listTools(): Promise<ToolEntry[]>;
    /**
     * Close all active WebSocket connections.
     */
    close(): void;
}
//# sourceMappingURL=sdk.d.ts.map