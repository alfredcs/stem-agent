import express from "express";
import cors from "cors";
import compression from "compression";
import { createServer, type Server as HttpServer } from "node:http";
import { createLogger, type IStemAgent, type Logger, type IMCPManager, type IMemoryManager } from "@stem-agent/shared";
import { AuthMiddleware, type AuthConfig, type IAuthProvider, ApiKeyProvider, JwtProvider } from "./auth/index.js";
import {
  requestIdMiddleware,
  loggingMiddleware,
  RateLimiter,
  errorHandler,
  type RateLimitConfig,
} from "./middleware/index.js";
import { A2AHandler, agentCardRouter } from "./a2a/index.js";
import { restRouter } from "./rest/index.js";
import { buildOpenApiSpec } from "./rest/openapi-spec.js";
import { WsHandler } from "./websocket/index.js";

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
export class Gateway {
  private readonly app: express.Application;
  private readonly httpServer: HttpServer;
  private readonly wsHandler: WsHandler;
  private readonly logger: Logger;
  private readonly config: GatewayConfig;

  constructor(
    private readonly agent: IStemAgent,
    config: GatewayConfig = {},
  ) {
    this.config = config;
    this.logger = createLogger("gateway", { level: config.logLevel });
    this.app = express();
    this.httpServer = createServer(this.app);

    this.setupMiddleware();
    this.setupRoutes();

    const wsAuthProviders: IAuthProvider[] = [];
    if (this.config.auth?.enabled) {
      if (this.config.auth.apiKey) {
        wsAuthProviders.push(new ApiKeyProvider(this.config.auth.apiKey));
      }
      if (this.config.auth.jwt) {
        wsAuthProviders.push(new JwtProvider(this.config.auth.jwt));
      }
    }
    this.wsHandler = new WsHandler(
      agent,
      this.logger,
      wsAuthProviders.length > 0 ? wsAuthProviders : undefined,
    );
    this.wsHandler.attach(this.httpServer);
  }

  /** Start listening for connections. */
  async start(): Promise<void> {
    const host = this.config.host ?? process.env["HOST"] ?? "127.0.0.1";
    const port = this.config.port ?? (process.env["PORT"] ? Number(process.env["PORT"]) : 8000);

    return new Promise((resolve) => {
      this.httpServer.listen(port, host, () => {
        this.logger.info({ host, port }, "gateway started");
        resolve();
      });
    });
  }

  /** Gracefully shutdown the gateway. */
  async stop(): Promise<void> {
    this.wsHandler.close();
    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /** Access the underlying Express app (useful for testing with supertest). */
  getApp(): express.Application {
    return this.app;
  }

  /** Access the underlying HTTP server. */
  getHttpServer(): HttpServer {
    return this.httpServer;
  }

  private setupMiddleware(): void {
    // Body parsing
    this.app.use(express.json());

    // Request ID
    this.app.use(requestIdMiddleware);

    // Logging
    this.app.use(loggingMiddleware(this.logger));

    // CORS
    this.app.use(cors({ origin: this.config.corsOrigin ?? "*" }));

    // Compression
    this.app.use(compression());

    // Auth
    if (this.config.auth?.enabled) {
      const authMiddleware = new AuthMiddleware({
        ...this.config.auth,
        publicPaths: [
          "/.well-known/agent.json",
          "/api/v1/health",
          "/docs",
          "/api-docs",
          ...(this.config.auth.publicPaths ?? []),
        ],
      });

      if (this.config.auth.apiKey) {
        authMiddleware.addProvider(new ApiKeyProvider(this.config.auth.apiKey));
      }
      if (this.config.auth.jwt) {
        authMiddleware.addProvider(new JwtProvider(this.config.auth.jwt));
      }

      this.app.use(authMiddleware.handler);
    }

    // Rate limiting
    if (this.config.rateLimit) {
      const limiter = new RateLimiter(this.config.rateLimit);
      this.app.use(limiter.handler);
    }
  }

  private setupRoutes(): void {
    // A2A agent card
    this.app.use(agentCardRouter(this.agent));

    // A2A JSON-RPC endpoint
    const a2aHandler = new A2AHandler(this.agent);
    this.app.use(a2aHandler.createRouter());

    // REST API
    this.app.use(restRouter({
      agent: this.agent,
      memoryManager: this.config.memoryManager,
      mcpManager: this.config.mcpManager,
    }));

    // OpenAPI spec endpoint
    this.app.get("/api-docs", (_req, res) => {
      const card = this.agent.getAgentCard();
      res.json(buildOpenApiSpec(card.name, card.version));
    });

    // Swagger UI (if swagger-ui-express is available)
    try {
      // Dynamic import to make swagger-ui-express optional
      void import("swagger-ui-express").then((swaggerUi) => {
        const card = this.agent.getAgentCard();
        const spec = buildOpenApiSpec(card.name, card.version);
        this.app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
      });
    } catch {
      this.logger.debug("swagger-ui-express not available, /docs disabled");
    }

    // Global error handler (must be last)
    this.app.use(errorHandler);
  }
}
