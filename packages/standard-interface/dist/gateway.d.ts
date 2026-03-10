import express from "express";
import { type Server as HttpServer } from "node:http";
import { type IStemAgent, type IMCPManager, type IMemoryManager } from "@stem-agent/shared";
import { type AuthConfig } from "./auth/index.js";
import { type RateLimitConfig } from "./middleware/index.js";
/**
 * Configuration for the Gateway.
 */
export interface GatewayConfig {
    /** Server host. Defaults to HOST env or "127.0.0.1". */
    host?: string;
    /** Server port. Defaults to PORT env or 8000. */
    port?: number;
    /** Auth configuration. */
    auth?: AuthConfig;
    /** Rate limiting configuration. */
    rateLimit?: RateLimitConfig;
    /** CORS origin. Defaults to "*". */
    corsOrigin?: string | string[];
    /** Log level. Defaults to "info". */
    logLevel?: string;
    /** Optional MCP manager for tool introspection routes. */
    mcpManager?: IMCPManager;
    /** Optional memory manager for profile routes. */
    memoryManager?: IMemoryManager;
}
/**
 * Unified Gateway that routes requests to the appropriate protocol handler.
 * Mounts A2A, REST, WebSocket endpoints with shared auth and middleware.
 */
export declare class Gateway {
    private readonly agent;
    private readonly app;
    private readonly httpServer;
    private readonly wsHandler;
    private readonly logger;
    private readonly config;
    constructor(agent: IStemAgent, config?: GatewayConfig);
    /** Start listening for connections. */
    start(): Promise<void>;
    /** Gracefully shutdown the gateway. */
    stop(): Promise<void>;
    /** Access the underlying Express app (useful for testing with supertest). */
    getApp(): express.Application;
    /** Access the underlying HTTP server. */
    getHttpServer(): HttpServer;
    private setupMiddleware;
    private setupRoutes;
}
//# sourceMappingURL=gateway.d.ts.map