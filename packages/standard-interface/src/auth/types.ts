import type { Credential, Principal } from "@stem-agent/shared";

/**
 * Interface for pluggable authentication providers.
 * Each provider handles a specific credential type (API key, JWT, OAuth2).
 */
export interface IAuthProvider {
  /** The credential type this provider handles. */
  readonly type: string;

  /**
   * Authenticate a credential and return a Principal if valid.
   * Returns null if the credential is invalid or unrecognized by this provider.
   */
  authenticate(credential: Credential): Promise<Principal | null>;
}

/**
 * Configuration for the auth middleware.
 */
export interface AuthConfig {
  /** Whether authentication is enabled. When false, all requests pass through. */
  enabled: boolean;
  /** Paths that skip authentication (e.g. health checks, agent card). */
  publicPaths?: string[];
  /** API key configuration. */
  apiKey?: ApiKeyConfig;
  /** JWT configuration. */
  jwt?: JwtConfig;
  /** OAuth2 configuration. */
  oauth2?: OAuth2Config;
}

export interface ApiKeyConfig {
  /** Map of valid API keys to principal metadata. */
  keys: Record<string, { id: string; roles?: string[]; permissions?: string[] }>;
}

export interface JwtConfig {
  /** Secret for HS256 or public key for RS256. */
  secret: string;
  /** Expected algorithms. Defaults to ["HS256"]. */
  algorithms?: string[];
  /** Expected issuer. */
  issuer?: string;
  /** Expected audience. */
  audience?: string;
}

export interface OAuth2Config {
  /** Token introspection endpoint. */
  introspectionEndpoint: string;
  /** Client ID for introspection. */
  clientId: string;
  /** Client secret for introspection. */
  clientSecret: string;
}
