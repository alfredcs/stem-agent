import { createHmac, timingSafeEqual } from "node:crypto";
import type { Credential, Principal } from "@stem-agent/shared";
import type { IAuthProvider, JwtConfig } from "./types.js";

/**
 * Authenticates requests using JWT tokens.
 * Supports HS256 signature verification with configurable issuer/audience checks.
 */
export class JwtProvider implements IAuthProvider {
  readonly type = "jwt";

  private readonly secret: string;
  private readonly issuer?: string;
  private readonly audience?: string;

  constructor(config: JwtConfig) {
    this.secret = config.secret;
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  async authenticate(credential: Credential): Promise<Principal | null> {
    if (credential.type !== "jwt" && credential.type !== "bearer_token") {
      return null;
    }

    const payload = this.verifyToken(credential.value);
    if (!payload) return null;

    const principalType = (payload.type as string) ?? "user";

    return {
      id: (payload.sub as string) ?? "unknown",
      type: principalType as "user" | "agent" | "service",
      attributes: (payload.attributes as Record<string, unknown>) ?? {},
      roles: (payload.roles as string[]) ?? [],
      permissions: (payload.permissions as string[]) ?? [],
      credential,
    };
  }

  private verifyToken(token: string): Record<string, unknown> | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature (HS256)
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = createHmac("sha256", this.secret)
      .update(data)
      .digest("base64url");

    if (!timingSafeEqual(Buffer.from(signatureB64!), Buffer.from(expectedSig))) {
      return null;
    }

    // Decode payload
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(payloadB64!, "base64url").toString());
    } catch {
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
