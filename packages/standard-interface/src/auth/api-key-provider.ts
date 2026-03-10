import type { Credential, Principal } from "@stem-agent/shared";
import type { ApiKeyConfig, IAuthProvider } from "./types.js";

/**
 * Authenticates requests using a static API key store.
 * Keys are matched against a configured map of key -> principal metadata.
 */
export class ApiKeyProvider implements IAuthProvider {
  readonly type = "api_key";

  private readonly keys: ApiKeyConfig["keys"];

  constructor(config: ApiKeyConfig) {
    this.keys = config.keys;
  }

  async authenticate(credential: Credential): Promise<Principal | null> {
    if (credential.type !== "api_key") return null;

    const entry = this.keys[credential.value];
    if (!entry) return null;

    return {
      id: entry.id,
      type: "service",
      attributes: {},
      roles: entry.roles ?? [],
      permissions: entry.permissions ?? [],
      credential,
    };
  }
}
