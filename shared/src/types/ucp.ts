import { z } from "zod";

// ---------------------------------------------------------------------------
// UCP Types (Universal Commerce Protocol v2026-01-23)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// UCP Discovery Profile — served at /.well-known/ucp
// ---------------------------------------------------------------------------

export const UcpCapabilityEnum = z.enum([
  "checkout",
  "catalog",
  "order_management",
  "returns",
  "subscriptions",
]);
export type UcpCapabilityEnum = z.infer<typeof UcpCapabilityEnum>;

export const UcpDiscoveryProfileSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default("2026-01-23"),
  capabilities: z.array(UcpCapabilityEnum),
  endpoints: z.object({
    checkout: z.string().optional(),
    catalog: z.string().optional(),
    orders: z.string().optional(),
  }),
  authentication: z.object({
    type: z.enum(["oauth2", "api_key", "none"]).default("none"),
    tokenUrl: z.string().optional(),
  }).default({}),
});

export type UcpDiscoveryProfile = z.infer<typeof UcpDiscoveryProfileSchema>;

// ---------------------------------------------------------------------------
// Line Items
// ---------------------------------------------------------------------------

export const UcpItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.object({
    amount: z.string(), // Decimal string e.g. "19.99"
    currency: z.string().default("USD"),
  }),
  metadata: z.record(z.unknown()).default({}),
});

export type UcpItem = z.infer<typeof UcpItemSchema>;

// ---------------------------------------------------------------------------
// Checkout Session
// ---------------------------------------------------------------------------

export const UcpCheckoutStatus = z.enum([
  "open",
  "processing",
  "completed",
  "cancelled",
  "expired",
]);
export type UcpCheckoutStatus = z.infer<typeof UcpCheckoutStatus>;

export const UcpCheckoutSessionSchema = z.object({
  id: z.string(),
  status: UcpCheckoutStatus,
  lineItems: z.array(UcpItemSchema),
  totals: z.object({
    subtotal: z.string(),
    tax: z.string().optional(),
    total: z.string(),
    currency: z.string().default("USD"),
  }).optional(),
  payment: z.object({
    method: z.string().optional(),
    status: z.enum(["pending", "authorized", "captured", "failed"]).default("pending"),
  }).optional(),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type UcpCheckoutSession = z.infer<typeof UcpCheckoutSessionSchema>;

// ---------------------------------------------------------------------------
// Checkout Create Request
// ---------------------------------------------------------------------------

export const UcpCheckoutCreateRequestSchema = z.object({
  lineItems: z.array(UcpItemSchema).min(1),
  payment: z.object({
    method: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type UcpCheckoutCreateRequest = z.infer<typeof UcpCheckoutCreateRequestSchema>;

// ---------------------------------------------------------------------------
// Checkout Complete Request
// ---------------------------------------------------------------------------

export const UcpCheckoutCompleteRequestSchema = z.object({
  payment: z.object({
    method: z.string().optional(),
    token: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type UcpCheckoutCompleteRequest = z.infer<typeof UcpCheckoutCompleteRequestSchema>;
