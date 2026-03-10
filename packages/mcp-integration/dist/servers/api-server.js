"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIServer = void 0;
const base_server_js_1 = require("./base-server.js");
/**
 * MCP server wrapping external REST/GraphQL APIs.
 *
 * Dynamically registers tools from endpoint definitions. Provides rate
 * limiting, retry with exponential backoff, and response caching.
 */
class APIServer extends base_server_js_1.BaseMCPServer {
    httpClient;
    apiConfig;
    cache = new Map();
    tokenBucket;
    lastRefillTime;
    constructor(config, apiConfig, httpClient, logger) {
        super(config, logger);
        this.apiConfig = apiConfig;
        this.httpClient = httpClient;
        this.tokenBucket = apiConfig.maxRequestsPerSecond ?? 10;
        this.lastRefillTime = Date.now();
    }
    /** @inheritdoc */
    async initialize() {
        for (const ep of this.apiConfig.endpoints) {
            this.registerTool(ep.name, ep.description, (ep.parameters ?? []).map((p) => ({
                name: p.name,
                type: p.type,
                description: p.description ?? "",
                required: p.required ?? false,
            })), (args) => this.callEndpoint(ep, args));
        }
    }
    /* ------------------------------------------------------------------ */
    /*  Private helpers                                                    */
    /* ------------------------------------------------------------------ */
    async callEndpoint(ep, args) {
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
        const queryParams = {};
        const headers = {};
        let body = undefined;
        if (this.apiConfig.defaultAuth && ep.authHeader) {
            headers[ep.authHeader] = this.apiConfig.defaultAuth;
        }
        for (const paramDef of ep.parameters ?? []) {
            const value = args[paramDef.name];
            if (value === undefined)
                continue;
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
        let lastError;
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
            }
            catch (err) {
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
    async acquireToken() {
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.APIServer = APIServer;
//# sourceMappingURL=api-server.js.map