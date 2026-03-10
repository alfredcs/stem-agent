import { z } from "zod";
export declare const AuthProtocol: z.ZodEnum<["jwt", "oauth2", "saml", "api_key", "bearer_token", "mtls"]>;
export type AuthProtocol = z.infer<typeof AuthProtocol>;
export declare const CredentialSchema: z.ZodObject<{
    type: z.ZodEnum<["jwt", "oauth2", "saml", "api_key", "bearer_token", "mtls"]>;
    value: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    expiresAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
    metadata: Record<string, unknown>;
    expiresAt?: number | undefined;
}, {
    value: string;
    type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
    metadata?: Record<string, unknown> | undefined;
    expiresAt?: number | undefined;
}>;
export type Credential = z.infer<typeof CredentialSchema>;
export declare const PrincipalSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["user", "agent", "service"]>;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    roles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    credential: z.ZodObject<{
        type: z.ZodEnum<["jwt", "oauth2", "saml", "api_key", "bearer_token", "mtls"]>;
        value: z.ZodString;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        expiresAt: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
        metadata: Record<string, unknown>;
        expiresAt?: number | undefined;
    }, {
        value: string;
        type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
        metadata?: Record<string, unknown> | undefined;
        expiresAt?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "user" | "agent" | "service";
    permissions: string[];
    attributes: Record<string, unknown>;
    roles: string[];
    credential: {
        value: string;
        type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
        metadata: Record<string, unknown>;
        expiresAt?: number | undefined;
    };
}, {
    id: string;
    type: "user" | "agent" | "service";
    credential: {
        value: string;
        type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
        metadata?: Record<string, unknown> | undefined;
        expiresAt?: number | undefined;
    };
    permissions?: string[] | undefined;
    attributes?: Record<string, unknown> | undefined;
    roles?: string[] | undefined;
}>;
export type Principal = z.infer<typeof PrincipalSchema>;
export declare const AuthorizationContextSchema: z.ZodObject<{
    principal: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["user", "agent", "service"]>;
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        roles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        permissions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        credential: z.ZodObject<{
            type: z.ZodEnum<["jwt", "oauth2", "saml", "api_key", "bearer_token", "mtls"]>;
            value: z.ZodString;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            expiresAt: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata: Record<string, unknown>;
            expiresAt?: number | undefined;
        }, {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata?: Record<string, unknown> | undefined;
            expiresAt?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "user" | "agent" | "service";
        permissions: string[];
        attributes: Record<string, unknown>;
        roles: string[];
        credential: {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata: Record<string, unknown>;
            expiresAt?: number | undefined;
        };
    }, {
        id: string;
        type: "user" | "agent" | "service";
        credential: {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata?: Record<string, unknown> | undefined;
            expiresAt?: number | undefined;
        };
        permissions?: string[] | undefined;
        attributes?: Record<string, unknown> | undefined;
        roles?: string[] | undefined;
    }>;
    resource: z.ZodString;
    action: z.ZodString;
    environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    resource: string;
    principal: {
        id: string;
        type: "user" | "agent" | "service";
        permissions: string[];
        attributes: Record<string, unknown>;
        roles: string[];
        credential: {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata: Record<string, unknown>;
            expiresAt?: number | undefined;
        };
    };
    action: string;
    environment: Record<string, unknown>;
}, {
    resource: string;
    principal: {
        id: string;
        type: "user" | "agent" | "service";
        credential: {
            value: string;
            type: "oauth2" | "jwt" | "saml" | "api_key" | "bearer_token" | "mtls";
            metadata?: Record<string, unknown> | undefined;
            expiresAt?: number | undefined;
        };
        permissions?: string[] | undefined;
        attributes?: Record<string, unknown> | undefined;
        roles?: string[] | undefined;
    };
    action: string;
    environment?: Record<string, unknown> | undefined;
}>;
export type AuthorizationContext = z.infer<typeof AuthorizationContextSchema>;
//# sourceMappingURL=security.d.ts.map