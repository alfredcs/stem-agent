import { z } from "zod";

// ---------------------------------------------------------------------------
// AP2 — Agent Payments Protocol types
// ---------------------------------------------------------------------------

export const AP2CurrencyAmountSchema = z.object({
  amount: z.string(),
  currency: z.string().default("USD"),
});
export type AP2CurrencyAmount = z.infer<typeof AP2CurrencyAmountSchema>;

export const AP2PaymentItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: AP2CurrencyAmountSchema,
});
export type AP2PaymentItem = z.infer<typeof AP2PaymentItemSchema>;

export const AP2IntentMandateSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string(),
  allowedMerchants: z.array(z.string()).default([]),
  maxAmount: AP2CurrencyAmountSchema,
  autoApproveBelow: AP2CurrencyAmountSchema.optional(),
  refundable: z.boolean().default(true),
  expiresAt: z.number(),
  createdAt: z.number().default(() => Date.now()),
  status: z.enum(["active", "expired", "revoked"]).default("active"),
  metadata: z.record(z.unknown()).default({}),
});
export type AP2IntentMandate = z.infer<typeof AP2IntentMandateSchema>;

export const AP2PaymentMandateSchema = z.object({
  id: z.string().uuid(),
  intentMandateId: z.string().uuid(),
  agentId: z.string(),
  merchantId: z.string(),
  items: z.array(AP2PaymentItemSchema),
  totalAmount: AP2CurrencyAmountSchema,
  status: z
    .enum(["pending_approval", "approved", "rejected", "executed", "failed"])
    .default("pending_approval"),
  signature: z.string().optional(),
  approvedBy: z.string().optional(),
  createdAt: z.number().default(() => Date.now()),
  metadata: z.record(z.unknown()).default({}),
});
export type AP2PaymentMandate = z.infer<typeof AP2PaymentMandateSchema>;

export const AP2PaymentReceiptSchema = z.object({
  id: z.string().uuid(),
  paymentMandateId: z.string().uuid(),
  merchantId: z.string(),
  amount: AP2CurrencyAmountSchema,
  status: z.enum(["success", "failed", "refunded"]),
  transactionRef: z.string().optional(),
  timestamp: z.number().default(() => Date.now()),
  metadata: z.record(z.unknown()).default({}),
});
export type AP2PaymentReceipt = z.infer<typeof AP2PaymentReceiptSchema>;
