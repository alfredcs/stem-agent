import { z } from "zod";
// ---------------------------------------------------------------------------
// A2UI Protocol Types (v0.8)
// Agent-to-User Interface Protocol — declarative UI composition
// ---------------------------------------------------------------------------
// ---- 18 Component Primitives ----
export const A2UIComponentTypeSchema = z.enum([
    "text", "button", "row", "column", "card", "list", "list_item",
    "text_field", "checkbox", "radio_group", "radio_option",
    "select", "select_option", "date_input", "divider", "image", "link", "spacer",
]);
// ---- Flat component (adjacency list — children referenced by ID) ----
export const A2UIComponentSchema = z.object({
    id: z.string(),
    type: A2UIComponentTypeSchema,
    properties: z.record(z.unknown()).default({}),
    childIds: z.array(z.string()).default([]),
});
// ---- Server-to-client messages (discriminated on "type") ----
export const A2UIBeginRenderingSchema = z.object({
    type: z.literal("beginRendering"),
    surfaceId: z.string(),
    rootComponentId: z.string(),
});
export const A2UISurfaceUpdateSchema = z.object({
    type: z.literal("surfaceUpdate"),
    surfaceId: z.string(),
    components: z.array(A2UIComponentSchema),
});
export const A2UIDataModelUpdateSchema = z.object({
    type: z.literal("dataModelUpdate"),
    surfaceId: z.string(),
    data: z.record(z.unknown()),
});
export const A2UIDeleteSurfaceSchema = z.object({
    type: z.literal("deleteSurface"),
    surfaceId: z.string(),
});
/** Union of all server-to-client A2UI messages. */
export const A2UIServerMessageSchema = z.discriminatedUnion("type", [
    A2UIBeginRenderingSchema,
    A2UISurfaceUpdateSchema,
    A2UIDataModelUpdateSchema,
    A2UIDeleteSurfaceSchema,
]);
// ---- Client-to-server message ----
export const A2UIUserActionSchema = z.object({
    type: z.literal("userAction"),
    surfaceId: z.string(),
    componentId: z.string(),
    action: z.string(),
    value: z.unknown().optional(),
});
/** Union of all A2UI messages (server + client). */
export const A2UIMessageSchema = z.union([A2UIServerMessageSchema, A2UIUserActionSchema]);
// ---- Content type constant ----
export const A2UI_CONTENT_TYPE = "application/a2ui+jsonl";
//# sourceMappingURL=a2ui.js.map