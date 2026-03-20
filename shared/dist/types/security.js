import { z } from "zod";
// ---------------------------------------------------------------------------
// Security types (from design doc Sec 3.5)
// ---------------------------------------------------------------------------
export const AuthProtocol = z.enum([
    "jwt",
    "oauth2",
    "saml",
    "api_key",
    "bearer_token",
    "mtls",
]);
export const CredentialSchema = z.object({
    type: AuthProtocol,
    value: z.string(),
    metadata: z.record(z.unknown()).default({}),
    expiresAt: z.number().optional(),
});
export const PrincipalSchema = z.object({
    id: z.string(),
    type: z.enum(["user", "agent", "service"]),
    attributes: z.record(z.unknown()).default({}),
    roles: z.array(z.string()).default([]),
    permissions: z.array(z.string()).default([]),
    credential: CredentialSchema,
});
export const AuthorizationContextSchema = z.object({
    principal: PrincipalSchema,
    resource: z.string(),
    action: z.string(),
    environment: z.record(z.unknown()).default({}),
});
//# sourceMappingURL=security.js.map