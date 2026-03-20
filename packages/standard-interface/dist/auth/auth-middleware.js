/**
 * Express middleware that extracts credentials from requests,
 * authenticates via registered providers, and attaches the
 * Principal to `req.principal`.
 */
export class AuthMiddleware {
    providers = [];
    publicPaths;
    enabled;
    constructor(config) {
        this.enabled = config.enabled;
        this.publicPaths = new Set(config.publicPaths ?? []);
    }
    /** Register an authentication provider. */
    addProvider(provider) {
        this.providers.push(provider);
    }
    /** Express middleware handler. */
    handler = async (req, res, next) => {
        if (!this.enabled || this.publicPaths.has(req.path)) {
            next();
            return;
        }
        const credential = this.extractCredential(req);
        if (!credential) {
            res.status(401).json({ error: "Missing authentication" });
            return;
        }
        for (const provider of this.providers) {
            const principal = await provider.authenticate(credential);
            if (principal) {
                req.principal = principal;
                next();
                return;
            }
        }
        res.status(401).json({ error: "Invalid credentials" });
    };
    extractCredential(req) {
        // Bearer token (JWT / OAuth2)
        const authHeader = req.headers.authorization ?? "";
        if (authHeader.startsWith("Bearer ")) {
            return {
                type: "bearer_token",
                value: authHeader.slice(7),
                metadata: {},
            };
        }
        // API Key via header
        const apiKey = req.headers["x-api-key"];
        if (typeof apiKey === "string" && apiKey.length > 0) {
            return {
                type: "api_key",
                value: apiKey,
                metadata: {},
            };
        }
        return null;
    }
}
//# sourceMappingURL=auth-middleware.js.map