import type { Request, Response, NextFunction } from "express";
import type { Principal } from "@stem-agent/shared";
import type { AuthConfig, IAuthProvider } from "./types.js";
/** Express request augmented with an authenticated principal. */
export interface AuthenticatedRequest extends Request {
    principal?: Principal;
}
/**
 * Express middleware that extracts credentials from requests,
 * authenticates via registered providers, and attaches the
 * Principal to `req.principal`.
 */
export declare class AuthMiddleware {
    private readonly providers;
    private readonly publicPaths;
    private readonly enabled;
    constructor(config: AuthConfig);
    /** Register an authentication provider. */
    addProvider(provider: IAuthProvider): void;
    /** Express middleware handler. */
    handler: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    private extractCredential;
}
//# sourceMappingURL=auth-middleware.d.ts.map