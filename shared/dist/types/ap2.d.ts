import { z } from "zod";
export declare const AP2CurrencyAmountSchema: z.ZodObject<{
    amount: z.ZodString;
    currency: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: string;
    currency: string;
}, {
    amount: string;
    currency?: string | undefined;
}>;
export type AP2CurrencyAmount = z.infer<typeof AP2CurrencyAmountSchema>;
export declare const AP2PaymentItemSchema: z.ZodObject<{
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
}, "strip", z.ZodTypeAny, {
    name: string;
    quantity: number;
    unitPrice: {
        amount: string;
        currency: string;
    };
    description?: string | undefined;
}, {
    name: string;
    unitPrice: {
        amount: string;
        currency?: string | undefined;
    };
    description?: string | undefined;
    quantity?: number | undefined;
}>;
export type AP2PaymentItem = z.infer<typeof AP2PaymentItemSchema>;
export declare const AP2IntentMandateSchema: z.ZodObject<{
    id: z.ZodString;
    ownerId: z.ZodString;
    allowedMerchants: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    maxAmount: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency?: string | undefined;
    }>;
    autoApproveBelow: z.ZodOptional<z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency?: string | undefined;
    }>>;
    refundable: z.ZodDefault<z.ZodBoolean>;
    expiresAt: z.ZodNumber;
    createdAt: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["active", "expired", "revoked"]>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "active" | "expired" | "revoked";
    metadata: Record<string, unknown>;
    createdAt: number;
    expiresAt: number;
    ownerId: string;
    allowedMerchants: string[];
    maxAmount: {
        amount: string;
        currency: string;
    };
    refundable: boolean;
    autoApproveBelow?: {
        amount: string;
        currency: string;
    } | undefined;
}, {
    id: string;
    expiresAt: number;
    ownerId: string;
    maxAmount: {
        amount: string;
        currency?: string | undefined;
    };
    status?: "active" | "expired" | "revoked" | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: number | undefined;
    allowedMerchants?: string[] | undefined;
    autoApproveBelow?: {
        amount: string;
        currency?: string | undefined;
    } | undefined;
    refundable?: boolean | undefined;
}>;
export type AP2IntentMandate = z.infer<typeof AP2IntentMandateSchema>;
export declare const AP2PaymentMandateSchema: z.ZodObject<{
    id: z.ZodString;
    intentMandateId: z.ZodString;
    agentId: z.ZodString;
    merchantId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        description?: string | undefined;
    }, {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
    }>, "many">;
    totalAmount: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency?: string | undefined;
    }>;
    status: z.ZodDefault<z.ZodEnum<["pending_approval", "approved", "rejected", "executed", "failed"]>>;
    signature: z.ZodOptional<z.ZodString>;
    approvedBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "failed" | "pending_approval" | "approved" | "rejected" | "executed";
    metadata: Record<string, unknown>;
    agentId: string;
    createdAt: number;
    intentMandateId: string;
    merchantId: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: {
            amount: string;
            currency: string;
        };
        description?: string | undefined;
    }[];
    totalAmount: {
        amount: string;
        currency: string;
    };
    signature?: string | undefined;
    approvedBy?: string | undefined;
}, {
    id: string;
    agentId: string;
    intentMandateId: string;
    merchantId: string;
    items: {
        name: string;
        unitPrice: {
            amount: string;
            currency?: string | undefined;
        };
        description?: string | undefined;
        quantity?: number | undefined;
    }[];
    totalAmount: {
        amount: string;
        currency?: string | undefined;
    };
    status?: "failed" | "pending_approval" | "approved" | "rejected" | "executed" | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: number | undefined;
    signature?: string | undefined;
    approvedBy?: string | undefined;
}>;
export type AP2PaymentMandate = z.infer<typeof AP2PaymentMandateSchema>;
export declare const AP2PaymentReceiptSchema: z.ZodObject<{
    id: z.ZodString;
    paymentMandateId: z.ZodString;
    merchantId: z.ZodString;
    amount: z.ZodObject<{
        amount: z.ZodString;
        currency: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: string;
        currency: string;
    }, {
        amount: string;
        currency?: string | undefined;
    }>;
    status: z.ZodEnum<["success", "failed", "refunded"]>;
    transactionRef: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "failed" | "success" | "refunded";
    metadata: Record<string, unknown>;
    timestamp: number;
    amount: {
        amount: string;
        currency: string;
    };
    merchantId: string;
    paymentMandateId: string;
    transactionRef?: string | undefined;
}, {
    id: string;
    status: "failed" | "success" | "refunded";
    amount: {
        amount: string;
        currency?: string | undefined;
    };
    merchantId: string;
    paymentMandateId: string;
    metadata?: Record<string, unknown> | undefined;
    timestamp?: number | undefined;
    transactionRef?: string | undefined;
}>;
export type AP2PaymentReceipt = z.infer<typeof AP2PaymentReceiptSchema>;
//# sourceMappingURL=ap2.d.ts.map