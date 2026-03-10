import type { Credential, Principal } from "@stem-agent/shared";
import type { IAuthProvider, OAuth2Config } from "./types.js";

/**
 * Authenticates requests by introspecting OAuth2 tokens against a token endpoint.
 */
export class OAuth2Provider implements IAuthProvider {
  readonly type = "oauth2";

  private readonly introspectionEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(config: OAuth2Config) {
    this.introspectionEndpoint = config.introspectionEndpoint;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async authenticate(credential: Credential): Promise<Principal | null> {
    if (credential.type !== "oauth2" && credential.type !== "bearer_token") {
      return null;
    }

    try {
      const basicAuth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString("base64");

      const resp = await fetch(this.introspectionEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: `token=${encodeURIComponent(credential.value)}`,
      });

      if (!resp.ok) return null;

      const data = (await resp.json()) as Record<string, unknown>;
      if (!data.active) return null;

      return {
        id: (data.sub as string) ?? "unknown",
        type: "user",
        attributes: { scope: data.scope },
        roles: [],
        permissions: typeof data.scope === "string"
          ? (data.scope as string).split(" ")
          : [],
        credential,
      };
    } catch {
      return null;
    }
  }
}
