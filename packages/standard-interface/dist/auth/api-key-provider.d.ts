import type { Credential, Principal } from "@stem-agent/shared";
import type { ApiKeyConfig, IAuthProvider } from "./types.js";
/**
 * Authenticates requests using a static API key store.
 * Keys are matched against a configured map of key -> principal metadata.
 */
export declare class ApiKeyProvider implements IAuthProvider {
    readonly type = "api_key";
    private readonly keys;
    constructor(config: ApiKeyConfig);
    authenticate(credential: Credential): Promise<Principal | null>;
}
//# sourceMappingURL=api-key-provider.d.ts.map