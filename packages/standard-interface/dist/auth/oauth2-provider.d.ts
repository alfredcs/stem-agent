import type { Credential, Principal } from "@stem-agent/shared";
import type { IAuthProvider, OAuth2Config } from "./types.js";
/**
 * Authenticates requests by introspecting OAuth2 tokens against a token endpoint.
 */
export declare class OAuth2Provider implements IAuthProvider {
    readonly type = "oauth2";
    private readonly introspectionEndpoint;
    private readonly clientId;
    private readonly clientSecret;
    constructor(config: OAuth2Config);
    authenticate(credential: Credential): Promise<Principal | null>;
}
//# sourceMappingURL=oauth2-provider.d.ts.map