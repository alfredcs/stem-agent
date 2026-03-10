import type { Credential, Principal } from "@stem-agent/shared";
import type { IAuthProvider, JwtConfig } from "./types.js";
/**
 * Authenticates requests using JWT tokens.
 * Supports HS256 signature verification with configurable issuer/audience checks.
 */
export declare class JwtProvider implements IAuthProvider {
    readonly type = "jwt";
    private readonly secret;
    private readonly issuer?;
    private readonly audience?;
    constructor(config: JwtConfig);
    authenticate(credential: Credential): Promise<Principal | null>;
    private verifyToken;
}
//# sourceMappingURL=jwt-provider.d.ts.map