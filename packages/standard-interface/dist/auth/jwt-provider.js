import { createHmac, timingSafeEqual } from "node:crypto";
/**
 * Authenticates requests using JWT tokens.
 * Supports HS256 signature verification with configurable issuer/audience checks.
 */
export class JwtProvider {
    type = "jwt";
    secret;
    issuer;
    audience;
    constructor(config) {
        this.secret = config.secret;
        this.issuer = config.issuer;
        this.audience = config.audience;
    }
    async authenticate(credential) {
        if (credential.type !== "jwt" && credential.type !== "bearer_token") {
            return null;
        }
        const payload = this.verifyToken(credential.value);
        if (!payload)
            return null;
        const principalType = payload.type ?? "user";
        return {
            id: payload.sub ?? "unknown",
            type: principalType,
            attributes: payload.attributes ?? {},
            roles: payload.roles ?? [],
            permissions: payload.permissions ?? [],
            credential,
        };
    }
    verifyToken(token) {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        const [headerB64, payloadB64, signatureB64] = parts;
        // Verify signature (HS256)
        const data = `${headerB64}.${payloadB64}`;
        const expectedSig = createHmac("sha256", this.secret)
            .update(data)
            .digest("base64url");
        if (!timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSig))) {
            return null;
        }
        // Decode payload
        let payload;
        try {
            payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
        }
        catch {
            return null;
        }
        // Check expiration
        if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
            return null;
        }
        // Check issuer
        if (this.issuer && payload.iss !== this.issuer) {
            return null;
        }
        // Check audience
        if (this.audience && payload.aud !== this.audience) {
            return null;
        }
        return payload;
    }
}
//# sourceMappingURL=jwt-provider.js.map