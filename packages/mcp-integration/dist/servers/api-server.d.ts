import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";
/** HTTP methods supported for API endpoints. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
/** Definition of an API endpoint to expose as a tool. */
export interface APIEndpointDefinition {
    /** Tool name (must be unique across the server). */
    name: string;
    /** Human-readable description. */
    description: string;
    /** HTTP method. */
    method: HttpMethod;
    /** URL path (may contain :param placeholders). */
    path: string;
    /** Named parameters with types. */
    parameters?: Array<{
        name: string;
        type: string;
        description?: string;
        required?: boolean;
        in: "path" | "query" | "body" | "header";
    }>;
    /** Auth header name (e.g. "Authorization"). */
    authHeader?: string;
    /** Cache TTL in milliseconds. 0 = no caching. */
    cacheTtlMs?: number;
}
/** Abstract HTTP client used by the API server. */
export interface IHttpClient {
    request(opts: {
        method: HttpMethod;
        url: string;
        headers?: Record<string, string>;
        body?: unknown;
        queryParams?: Record<string, string>;
    }): Promise<{
        status: number;
        data: unknown;
        headers: Record<string, string>;
    }>;
}
/** Configuration for the API server. */
export interface APIServerConfig {
    /** Base URL of the target API. */
    baseUrl: string;
    /** Endpoint definitions to register as tools. */
    endpoints: APIEndpointDefinition[];
    /** Default auth header value (e.g. "Bearer xxx"). */
    defaultAuth?: string;
    /** Maximum requests per second (rate limit). */
    maxRequestsPerSecond?: number;
    /** Maximum retry attempts on transient failures. */
    maxRetries?: number;
}
/**
 * MCP server wrapping external REST/GraphQL APIs.
 *
 * Dynamically registers tools from endpoint definitions. Provides rate
 * limiting, retry with exponential backoff, and response caching.
 */
export declare class APIServer extends BaseMCPServer {
    private readonly httpClient;
    private readonly apiConfig;
    private readonly cache;
    private tokenBucket;
    private lastRefillTime;
    constructor(config: MCPServerConfig, apiConfig: APIServerConfig, httpClient: IHttpClient, logger?: Logger);
    /** @inheritdoc */
    protected initialize(): Promise<void>;
    private callEndpoint;
    /** Simple token-bucket rate limiter. */
    private acquireToken;
    private sleep;
}
//# sourceMappingURL=api-server.d.ts.map