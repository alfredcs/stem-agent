"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Provider = void 0;
/**
 * Authenticates requests by introspecting OAuth2 tokens against a token endpoint.
 */
class OAuth2Provider {
    type = "oauth2";
    introspectionEndpoint;
    clientId;
    clientSecret;
    constructor(config) {
        this.introspectionEndpoint = config.introspectionEndpoint;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
    }
    async authenticate(credential) {
        if (credential.type !== "oauth2" && credential.type !== "bearer_token") {
            return null;
        }
        try {
            const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
            const resp = await fetch(this.introspectionEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${basicAuth}`,
                },
                body: `token=${encodeURIComponent(credential.value)}`,
            });
            if (!resp.ok)
                return null;
            const data = (await resp.json());
            if (!data.active)
                return null;
            return {
                id: data.sub ?? "unknown",
                type: "user",
                attributes: { scope: data.scope },
                roles: [],
                permissions: typeof data.scope === "string"
                    ? data.scope.split(" ")
                    : [],
                credential,
            };
        }
        catch {
            return null;
        }
    }
}
exports.OAuth2Provider = OAuth2Provider;
//# sourceMappingURL=oauth2-provider.js.map