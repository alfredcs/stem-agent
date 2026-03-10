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
  }): Promise<{ status: number; data: unknown; headers: Record<string, string> }>;
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

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * MCP server wrapping external REST/GraphQL APIs.
 *
 * Dynamically registers tools from endpoint definitions. Provides rate
 * limiting, retry with exponential backoff, and response caching.
 */
export class APIServer extends BaseMCPServer {
  private readonly httpClient: IHttpClient;
  private readonly apiConfig: APIServerConfig;
  private readonly cache = new Map<string, CacheEntry>();
  private tokenBucket: number;
  private lastRefillTime: number;

  constructor(
    config: MCPServerConfig,
    apiConfig: APIServerConfig,
    httpClient: IHttpClient,
    logger?: Logger,
  ) {
    super(config, logger);
    this.apiConfig = apiConfig;
    this.httpClient = httpClient;
    this.tokenBucket = apiConfig.maxRequestsPerSecond ?? 10;
    this.lastRefillTime = Date.now();
  }

  /** @inheritdoc */
  protected async initialize(): Promise<void> {
    for (const ep of this.apiConfig.endpoints) {
      this.registerTool(
        ep.name,
        ep.description,
        (ep.parameters ?? []).map((p) => ({
          name: p.name,
          type: p.type,
          description: p.description ?? "",
          required: p.required ?? false,
        })),
        (args) => this.callEndpoint(ep, args),
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  private async callEndpoint(
    ep: APIEndpointDefinition,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // Check cache first
    const cacheKey = `${ep.name}:${JSON.stringify(args)}`;
    if (ep.cacheTtlMs && ep.cacheTtlMs > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }
    }

    await this.acquireToken();

    // Build URL with path params
    let url = `${this.apiConfig.baseUrl}${ep.path}`;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    let body: unknown = undefined;

    if (this.apiConfig.defaultAuth && ep.authHeader) {
      headers[ep.authHeader] = this.apiConfig.defaultAuth;
    }

    for (const paramDef of ep.parameters ?? []) {
      const value = args[paramDef.name];
      if (value === undefined) continue;
      switch (paramDef.in) {
        case "path":
          url = url.replace(`:${paramDef.name}`, String(value));
          break;
        case "query":
          queryParams[paramDef.name] = String(value);
          break;
        case "header":
          headers[paramDef.name] = String(value);
          break;
        case "body":
          body = value;
          break;
      }
    }

    const maxRetries = this.apiConfig.maxRetries ?? 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.httpClient.request({
          method: ep.method,
          url,
          headers,
          body,
          queryParams,
        });

        // Cache if configured
        if (ep.cacheTtlMs && ep.cacheTtlMs > 0) {
          this.cache.set(cacheKey, {
            data: res.data,
            expiresAt: Date.now() + ep.cacheTtlMs,
          });
        }

        return res.data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * 2 ** attempt, 10_000);
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError;
  }

  /** Simple token-bucket rate limiter. */
  private async acquireToken(): Promise<void> {
    const maxTokens = this.apiConfig.maxRequestsPerSecond ?? 10;
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000;
    this.tokenBucket = Math.min(maxTokens, this.tokenBucket + elapsed * maxTokens);
    this.lastRefillTime = now;

    if (this.tokenBucket < 1) {
      const waitMs = ((1 - this.tokenBucket) / maxTokens) * 1000;
      await this.sleep(waitMs);
      this.tokenBucket = 1;
      this.lastRefillTime = Date.now();
    }

    this.tokenBucket -= 1;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
