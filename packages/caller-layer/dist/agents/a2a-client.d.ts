import { type AgentMessage, type AgentResponse } from "@stem-agent/shared";
import { type Logger } from "@stem-agent/shared";
import { z } from "zod";
/**
 * A2A v0.3.0 wire-format agent card (as returned by `/.well-known/agent.json`).
 * This differs from the internal AgentCard schema — fields like `agentId` and
 * `endpoint` are replaced by `url`, and `securitySchemes` is an object map.
 */
declare const A2AAgentCardSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    version: z.ZodString;
    protocolVersion: z.ZodDefault<z.ZodString>;
    capabilities: z.ZodDefault<z.ZodObject<{
        streaming: z.ZodDefault<z.ZodBoolean>;
        pushNotifications: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        streaming: boolean;
        pushNotifications: boolean;
    }, {
        streaming?: boolean | undefined;
        pushNotifications?: boolean | undefined;
    }>>;
    defaultInputModes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    defaultOutputModes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    skills: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        examples: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        id: string;
        tags: string[];
        examples: string[];
    }, {
        name: string;
        description: string;
        id: string;
        tags?: string[] | undefined;
        examples?: string[] | undefined;
    }>, "many">>;
    securitySchemes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    security: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    version: string;
    protocolVersion: string;
    capabilities: {
        streaming: boolean;
        pushNotifications: boolean;
    };
    defaultInputModes: string[];
    defaultOutputModes: string[];
    skills: {
        name: string;
        description: string;
        id: string;
        tags: string[];
        examples: string[];
    }[];
    securitySchemes: Record<string, unknown>;
    security: Record<string, string[]>[];
    url?: string | undefined;
}, {
    name: string;
    description: string;
    version: string;
    url?: string | undefined;
    protocolVersion?: string | undefined;
    capabilities?: {
        streaming?: boolean | undefined;
        pushNotifications?: boolean | undefined;
    } | undefined;
    defaultInputModes?: string[] | undefined;
    defaultOutputModes?: string[] | undefined;
    skills?: {
        name: string;
        description: string;
        id: string;
        tags?: string[] | undefined;
        examples?: string[] | undefined;
    }[] | undefined;
    securitySchemes?: Record<string, unknown> | undefined;
    security?: Record<string, string[]>[] | undefined;
}>;
export type A2AAgentCard = z.infer<typeof A2AAgentCardSchema>;
/** Options for constructing an {@link A2AClient}. */
export interface A2AClientOptions {
    /** Base URL of the remote agent (e.g. `http://agent.example.com`). */
    endpoint: string;
    /** Optional API key sent as `X-API-Key`. */
    apiKey?: string;
    /** Max retry attempts for transient failures. */
    maxRetries?: number;
    /** Initial backoff in ms (doubles each retry). */
    backoffMs?: number;
    /** Injected logger. */
    logger?: Logger;
}
/** JSON-RPC 2.0 error object. */
export interface JsonRpcError {
    code: number;
    message: string;
    data?: unknown;
}
/**
 * Client for communicating with a STEM agent (or any A2A-compatible agent)
 * via the A2A protocol (JSON-RPC 2.0).
 *
 * @example
 * ```ts
 * const client = new A2AClient({ endpoint: "http://localhost:8000" });
 * const card = await client.discoverAgent();
 * const result = await client.sendTask({ content: "Analyze Q3 sales" });
 * ```
 */
export declare class A2AClient {
    private readonly endpoint;
    private readonly headers;
    private readonly maxRetries;
    private readonly backoffMs;
    private readonly log;
    constructor(opts: A2AClientOptions);
    private rpc;
    /**
     * Discover the remote agent by fetching its Agent Card.
     * Maps to `GET /.well-known/agent.json`.
     */
    discoverAgent(): Promise<A2AAgentCard>;
    /**
     * Send a task to the remote agent.
     * Maps to JSON-RPC method `tasks/send`.
     */
    sendTask(message: Partial<AgentMessage> & {
        content: unknown;
    }): Promise<AgentResponse>;
    /**
     * Get the status / result of a previously sent task.
     * Maps to JSON-RPC method `tasks/get`.
     */
    getTask(taskId: string): Promise<AgentResponse>;
    /**
     * Cancel a running task.
     * Maps to JSON-RPC method `tasks/cancel`.
     */
    cancelTask(taskId: string): Promise<{
        cancelled: boolean;
    }>;
    /**
     * Subscribe to streaming updates for a task.
     * Maps to JSON-RPC method `tasks/sendSubscribe`.
     * Returns an async iterable of partial responses (SSE-backed).
     */
    subscribeToTask(message: Partial<AgentMessage> & {
        content: unknown;
    }): AsyncIterable<AgentResponse>;
}
/** Error thrown when the remote agent returns a JSON-RPC error. */
export declare class A2AError extends Error {
    readonly code: number;
    readonly data?: unknown | undefined;
    constructor(code: number, message: string, data?: unknown | undefined);
}
export {};
//# sourceMappingURL=a2a-client.d.ts.map