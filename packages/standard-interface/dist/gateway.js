"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gateway = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const node_http_1 = require("node:http");
const shared_1 = require("@stem-agent/shared");
const index_js_1 = require("./auth/index.js");
const index_js_2 = require("./middleware/index.js");
const index_js_3 = require("./a2a/index.js");
const index_js_4 = require("./rest/index.js");
const openapi_spec_js_1 = require("./rest/openapi-spec.js");
const index_js_5 = require("./websocket/index.js");
/**
 * Unified Gateway that routes requests to the appropriate protocol handler.
 * Mounts A2A, REST, WebSocket endpoints with shared auth and middleware.
 */
class Gateway {
    agent;
    app;
    httpServer;
    wsHandler;
    logger;
    config;
    constructor(agent, config = {}) {
        this.agent = agent;
        this.config = config;
        this.logger = (0, shared_1.createLogger)("gateway", { level: config.logLevel });
        this.app = (0, express_1.default)();
        this.httpServer = (0, node_http_1.createServer)(this.app);
        this.setupMiddleware();
        this.setupRoutes();
        const wsAuthProviders = [];
        if (this.config.auth?.enabled) {
            if (this.config.auth.apiKey) {
                wsAuthProviders.push(new index_js_1.ApiKeyProvider(this.config.auth.apiKey));
            }
            if (this.config.auth.jwt) {
                wsAuthProviders.push(new index_js_1.JwtProvider(this.config.auth.jwt));
            }
        }
        this.wsHandler = new index_js_5.WsHandler(agent, this.logger, wsAuthProviders.length > 0 ? wsAuthProviders : undefined);
        this.wsHandler.attach(this.httpServer);
    }
    /** Start listening for connections. */
    async start() {
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
    async stop() {
        this.wsHandler.close();
        return new Promise((resolve, reject) => {
            this.httpServer.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /** Access the underlying Express app (useful for testing with supertest). */
    getApp() {
        return this.app;
    }
    /** Access the underlying HTTP server. */
    getHttpServer() {
        return this.httpServer;
    }
    setupMiddleware() {
        // Body parsing
        this.app.use(express_1.default.json());
        // Request ID
        this.app.use(index_js_2.requestIdMiddleware);
        // Logging
        this.app.use((0, index_js_2.loggingMiddleware)(this.logger));
        // CORS
        this.app.use((0, cors_1.default)({ origin: this.config.corsOrigin ?? "*" }));
        // Compression
        this.app.use((0, compression_1.default)());
        // Auth
        if (this.config.auth?.enabled) {
            const authMiddleware = new index_js_1.AuthMiddleware({
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
                authMiddleware.addProvider(new index_js_1.ApiKeyProvider(this.config.auth.apiKey));
            }
            if (this.config.auth.jwt) {
                authMiddleware.addProvider(new index_js_1.JwtProvider(this.config.auth.jwt));
            }
            this.app.use(authMiddleware.handler);
        }
        // Rate limiting
        if (this.config.rateLimit) {
            const limiter = new index_js_2.RateLimiter(this.config.rateLimit);
            this.app.use(limiter.handler);
        }
    }
    setupRoutes() {
        // A2A agent card
        this.app.use((0, index_js_3.agentCardRouter)(this.agent));
        // A2A JSON-RPC endpoint
        const a2aHandler = new index_js_3.A2AHandler(this.agent);
        this.app.use(a2aHandler.createRouter());
        // REST API
        this.app.use((0, index_js_4.restRouter)({
            agent: this.agent,
            memoryManager: this.config.memoryManager,
            mcpManager: this.config.mcpManager,
        }));
        // OpenAPI spec endpoint
        this.app.get("/api-docs", (_req, res) => {
            const card = this.agent.getAgentCard();
            res.json((0, openapi_spec_js_1.buildOpenApiSpec)(card.name, card.version));
        });
        // Swagger UI (if swagger-ui-express is available)
        try {
            // Dynamic import to make swagger-ui-express optional
            void import("swagger-ui-express").then((swaggerUi) => {
                const card = this.agent.getAgentCard();
                const spec = (0, openapi_spec_js_1.buildOpenApiSpec)(card.name, card.version);
                this.app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
            });
        }
        catch {
            this.logger.debug("swagger-ui-express not available, /docs disabled");
        }
        // Global error handler (must be last)
        this.app.use(index_js_2.errorHandler);
    }
}
exports.Gateway = Gateway;
//# sourceMappingURL=gateway.js.map