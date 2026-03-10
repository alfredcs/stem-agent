import { z } from "zod";
export declare const AgentSkillSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    examples: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    description: string;
    tags: string[];
    examples: string[];
}, {
    name: string;
    id: string;
    description: string;
    tags?: string[] | undefined;
    examples?: string[] | undefined;
}>;
export type AgentSkill = z.infer<typeof AgentSkillSchema>;
export declare const SecuritySchemeSchema: z.ZodObject<{
    type: z.ZodEnum<["apiKey", "http", "oauth2"]>;
    in: z.ZodOptional<z.ZodEnum<["header", "query"]>>;
    name: z.ZodOptional<z.ZodString>;
    scheme: z.ZodOptional<z.ZodString>;
    bearerFormat: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "apiKey" | "http" | "oauth2";
    name?: string | undefined;
    in?: "header" | "query" | undefined;
    scheme?: string | undefined;
    bearerFormat?: string | undefined;
}, {
    type: "apiKey" | "http" | "oauth2";
    name?: string | undefined;
    in?: "header" | "query" | undefined;
    scheme?: string | undefined;
    bearerFormat?: string | undefined;
}>;
export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;
export declare const AgentCardSchema: z.ZodObject<{
    agentId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    version: z.ZodString;
    protocolVersion: z.ZodDefault<z.ZodString>;
    supportedProtocols: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    skills: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        examples: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        id: string;
        description: string;
        tags: string[];
        examples: string[];
    }, {
        name: string;
        id: string;
        description: string;
        tags?: string[] | undefined;
        examples?: string[] | undefined;
    }>, "many">>;
    endpoint: z.ZodString;
    maxConcurrentTasks: z.ZodDefault<z.ZodNumber>;
    supportsStreaming: z.ZodDefault<z.ZodBoolean>;
    supportsPushNotifications: z.ZodDefault<z.ZodBoolean>;
    defaultInputModes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    defaultOutputModes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    securitySchemes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["apiKey", "http", "oauth2"]>;
        in: z.ZodOptional<z.ZodEnum<["header", "query"]>>;
        name: z.ZodOptional<z.ZodString>;
        scheme: z.ZodOptional<z.ZodString>;
        bearerFormat: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "apiKey" | "http" | "oauth2";
        name?: string | undefined;
        in?: "header" | "query" | undefined;
        scheme?: string | undefined;
        bearerFormat?: string | undefined;
    }, {
        type: "apiKey" | "http" | "oauth2";
        name?: string | undefined;
        in?: "header" | "query" | undefined;
        scheme?: string | undefined;
        bearerFormat?: string | undefined;
    }>, "many">>;
    securityRequirements: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    agentId: string;
    version: string;
    protocolVersion: string;
    supportedProtocols: string[];
    skills: {
        name: string;
        id: string;
        description: string;
        tags: string[];
        examples: string[];
    }[];
    endpoint: string;
    maxConcurrentTasks: number;
    supportsStreaming: boolean;
    supportsPushNotifications: boolean;
    defaultInputModes: string[];
    defaultOutputModes: string[];
    securitySchemes: {
        type: "apiKey" | "http" | "oauth2";
        name?: string | undefined;
        in?: "header" | "query" | undefined;
        scheme?: string | undefined;
        bearerFormat?: string | undefined;
    }[];
    securityRequirements: Record<string, string[]>[];
}, {
    name: string;
    description: string;
    agentId: string;
    version: string;
    endpoint: string;
    protocolVersion?: string | undefined;
    supportedProtocols?: string[] | undefined;
    skills?: {
        name: string;
        id: string;
        description: string;
        tags?: string[] | undefined;
        examples?: string[] | undefined;
    }[] | undefined;
    maxConcurrentTasks?: number | undefined;
    supportsStreaming?: boolean | undefined;
    supportsPushNotifications?: boolean | undefined;
    defaultInputModes?: string[] | undefined;
    defaultOutputModes?: string[] | undefined;
    securitySchemes?: {
        type: "apiKey" | "http" | "oauth2";
        name?: string | undefined;
        in?: "header" | "query" | undefined;
        scheme?: string | undefined;
        bearerFormat?: string | undefined;
    }[] | undefined;
    securityRequirements?: Record<string, string[]>[] | undefined;
}>;
export type AgentCard = z.infer<typeof AgentCardSchema>;
//# sourceMappingURL=agent-card.d.ts.map