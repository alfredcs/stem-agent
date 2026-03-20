import { z } from "zod";
export declare const UcpCapabilityEnum: z.ZodEnum<["checkout", "catalog", "order_management", "returns", "subscriptions"]>;
export type UcpCapabilityEnum = z.infer<typeof UcpCapabilityEnum>;
export declare const UcpDiscoveryProfileSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    capabilities: z.ZodArray<z.ZodEnum<["checkout", "catalog", "order_management", "returns", "subscriptions"]>, "many">;
    endpoints: z.ZodObject<{
        checkout: z.ZodOptional<z.ZodString>;
        catalog: z.ZodOptional<z.ZodString>;
        orders: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        checkout?: string | undefined;
        catalog?: string | undefined;
        orders?: string | undefined;
    }, {
        checkout?: string | undefined;
        catalog?: string | undefined;
        orders?: string | undefined;
    }>;
    authentication: z.ZodDefault<z.ZodObject<{
        type: z.ZodDefault<z.ZodEnum<["oauth2", "api_key", "none"]>>;
        tokenUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "oauth2" | "api_key" | "none";
        tokenUrl?: string | undefined;
    }, {
        type?: "oauth2" | "api_key" | "none" | undefined;
        tokenUrl?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    capabilities: ("checkout" | "catalog" | "order_management" | "returns" | "subscriptions")[];
    endpoints: {
        checkout?: string | undefined;
        catalog?: string | undefined;
        orders?: string | undefined;
    };
    authentication: {
        type: "oauth2" | "api_key" | "none";
        tokenUrl?: string | undefined;
    };
    description?: string | undefined;
}, {
    name: string;
    capabilities: ("checkout" | "catalog" | "order_management" | "returns" | "subscriptions")[];
    endpoints: {
        checkout?: string | undefined;
        catalog?: string | undefined;
        orders?: string | undefined;
    };
    description?: string | undefined;
    version?: string | undefined;
    authentication?: {
        type?: "oauth2" | "api_key" | "none" | undefined;
        tokenUrl?: string | undefined;
    } | undefined;
}>;
export type UcpDiscoveryProfile = z.infer<typeof UcpDiscoveryProfileSchema>;
export declare const UcpItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    quantity: z.ZodDefault<z.ZodNumber>;
    unitPrice: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency?: string | undefined;
    }>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    quantity: number;
    unitPrice: {
        amount: string;
        currency: string;
    };
    metadata: Record<string, unknown>;
    description?: string | undefined;
    id?: string | undefined;
}, {
    name: string;
    unitPrice: {
        amount: string;
        currency?: string | undefined;
    };
    description?: string | undefined;
    quantity?: number | undefined;
    id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type UcpItem = z.infer<typeof UcpItemSchema>;
export declare const UcpCheckoutStatus: z.ZodEnum<["open", "processing", "completed", "cancelled", "expired"]>;
export type UcpCheckoutStatus = z.infer<typeof UcpCheckoutStatus>;
export declare const UcpCheckoutSessionSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["open", "processing", "completed", "cancelled", "expired"]>;
    lineItems: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPrice: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            amount: string;
            currency: string;
        }, {
            amount: string;
            currency?: string | undefined;
        }>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        metadata: Record<string, unknown>;
        description?: string | undefined;
        id?: string | undefined;
    }, {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
        id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    totals: z.ZodOptional<z.ZodObject<{
        subtotal: z.ZodString;
        tax: z.ZodOptional<z.ZodString>;
        total: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        subtotal: string;
        total: string;
        tax?: string | undefined;
    }, {
        subtotal: string;
        total: string;
        currency?: string | undefined;
        tax?: string | undefined;
    }>>;
    payment: z.ZodOptional<z.ZodObject<{
        method: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["pending", "authorized", "captured", "failed"]>>;
    }, "strip", z.ZodTypeAny, {
        status: "failed" | "pending" | "authorized" | "captured";
        method?: string | undefined;
    }, {
        status?: "failed" | "pending" | "authorized" | "captured" | undefined;
        method?: string | undefined;
    }>>;
    createdAt: z.ZodNumber;
    expiresAt: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "expired" | "open" | "processing" | "completed" | "cancelled";
    id: string;
    createdAt: number;
    metadata: Record<string, unknown>;
    lineItems: {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        metadata: Record<string, unknown>;
        description?: string | undefined;
        id?: string | undefined;
    }[];
    expiresAt?: number | undefined;
    totals?: {
        currency: string;
        subtotal: string;
        total: string;
        tax?: string | undefined;
    } | undefined;
    payment?: {
        status: "failed" | "pending" | "authorized" | "captured";
        method?: string | undefined;
    } | undefined;
}, {
    status: "expired" | "open" | "processing" | "completed" | "cancelled";
    id: string;
    createdAt: number;
    lineItems: {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
        id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    expiresAt?: number | undefined;
    metadata?: Record<string, unknown> | undefined;
    totals?: {
        subtotal: string;
        total: string;
        currency?: string | undefined;
        tax?: string | undefined;
    } | undefined;
    payment?: {
        status?: "failed" | "pending" | "authorized" | "captured" | undefined;
        method?: string | undefined;
    } | undefined;
}>;
export type UcpCheckoutSession = z.infer<typeof UcpCheckoutSessionSchema>;
export declare const UcpCheckoutCreateRequestSchema: z.ZodObject<{
    lineItems: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPrice: z.ZodObject<{
            amount: z.ZodString;
            currency: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            amount: string;
            currency: string;
        }, {
            amount: string;
            currency?: string | undefined;
        }>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        metadata: Record<string, unknown>;
        description?: string | undefined;
        id?: string | undefined;
    }, {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
        id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    payment: z.ZodOptional<z.ZodObject<{
        method: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        method?: string | undefined;
    }, {
        method?: string | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    lineItems: {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        metadata: Record<string, unknown>;
        description?: string | undefined;
        id?: string | undefined;
    }[];
    payment?: {
        method?: string | undefined;
    } | undefined;
}, {
    lineItems: {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
        id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    metadata?: Record<string, unknown> | undefined;
    payment?: {
        method?: string | undefined;
    } | undefined;
}>;
export type UcpCheckoutCreateRequest = z.infer<typeof UcpCheckoutCreateRequestSchema>;
export declare const UcpCheckoutCompleteRequestSchema: z.ZodObject<{
    payment: z.ZodOptional<z.ZodObject<{
        method: z.ZodOptional<z.ZodString>;
        token: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        method?: string | undefined;
        token?: string | undefined;
    }, {
        method?: string | undefined;
        token?: string | undefined;
    }>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, unknown>;
    payment?: {
        method?: string | undefined;
        token?: string | undefined;
    } | undefined;
}, {
    metadata?: Record<string, unknown> | undefined;
    payment?: {
        method?: string | undefined;
        token?: string | undefined;
    } | undefined;
}>;
export type UcpCheckoutCompleteRequest = z.infer<typeof UcpCheckoutCompleteRequestSchema>;
//# sourceMappingURL=ucp.d.ts.map