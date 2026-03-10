"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationContextSchema = exports.PrincipalSchema = exports.CredentialSchema = exports.AuthProtocol = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Security types (from design doc Sec 3.5)
// ---------------------------------------------------------------------------
exports.AuthProtocol = zod_1.z.enum([
    "jwt",
    "oauth2",
    "saml",
    "api_key",
    "bearer_token",
    "mtls",
]);
exports.CredentialSchema = zod_1.z.object({
    type: exports.AuthProtocol,
    value: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
    expiresAt: zod_1.z.number().optional(),
});
exports.PrincipalSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(["user", "agent", "service"]),
    attributes: zod_1.z.record(zod_1.z.unknown()).default({}),
    roles: zod_1.z.array(zod_1.z.string()).default([]),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    credential: exports.CredentialSchema,
});
exports.AuthorizationContextSchema = zod_1.z.object({
    principal: exports.PrincipalSchema,
    resource: zod_1.z.string(),
    action: zod_1.z.string(),
    environment: zod_1.z.record(zod_1.z.unknown()).default({}),
});
//# sourceMappingURL=security.js.map