import { z } from "zod";
export declare const A2UIComponentTypeSchema: z.ZodEnum<["text", "button", "row", "column", "card", "list", "list_item", "text_field", "checkbox", "radio_group", "radio_option", "select", "select_option", "date_input", "divider", "image", "link", "spacer"]>;
export type A2UIComponentType = z.infer<typeof A2UIComponentTypeSchema>;
export declare const A2UIComponentSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["text", "button", "row", "column", "card", "list", "list_item", "text_field", "checkbox", "radio_group", "radio_option", "select", "select_option", "date_input", "divider", "image", "link", "spacer"]>;
    properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    childIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
    id: string;
    properties: Record<string, unknown>;
    childIds: string[];
}, {
    type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
    id: string;
    properties?: Record<string, unknown> | undefined;
    childIds?: string[] | undefined;
}>;
export type A2UIComponent = z.infer<typeof A2UIComponentSchema>;
export declare const A2UIBeginRenderingSchema: z.ZodObject<{
    type: z.ZodLiteral<"beginRendering">;
    surfaceId: z.ZodString;
    rootComponentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}>;
export type A2UIBeginRendering = z.infer<typeof A2UIBeginRenderingSchema>;
export declare const A2UISurfaceUpdateSchema: z.ZodObject<{
    type: z.ZodLiteral<"surfaceUpdate">;
    surfaceId: z.ZodString;
    components: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "button", "row", "column", "card", "list", "list_item", "text_field", "checkbox", "radio_group", "radio_option", "select", "select_option", "date_input", "divider", "image", "link", "spacer"]>;
        properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        childIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }[];
}, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }[];
}>;
export type A2UISurfaceUpdate = z.infer<typeof A2UISurfaceUpdateSchema>;
export declare const A2UIDataModelUpdateSchema: z.ZodObject<{
    type: z.ZodLiteral<"dataModelUpdate">;
    surfaceId: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}>;
export type A2UIDataModelUpdate = z.infer<typeof A2UIDataModelUpdateSchema>;
export declare const A2UIDeleteSurfaceSchema: z.ZodObject<{
    type: z.ZodLiteral<"deleteSurface">;
    surfaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "deleteSurface";
    surfaceId: string;
}, {
    type: "deleteSurface";
    surfaceId: string;
}>;
export type A2UIDeleteSurface = z.infer<typeof A2UIDeleteSurfaceSchema>;
/** Union of all server-to-client A2UI messages. */
export declare const A2UIServerMessageSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"beginRendering">;
    surfaceId: z.ZodString;
    rootComponentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"surfaceUpdate">;
    surfaceId: z.ZodString;
    components: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "button", "row", "column", "card", "list", "list_item", "text_field", "checkbox", "radio_group", "radio_option", "select", "select_option", "date_input", "divider", "image", "link", "spacer"]>;
        properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        childIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }[];
}, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"dataModelUpdate">;
    surfaceId: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}>, z.ZodObject<{
    type: z.ZodLiteral<"deleteSurface">;
    surfaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "deleteSurface";
    surfaceId: string;
}, {
    type: "deleteSurface";
    surfaceId: string;
}>]>;
export type A2UIServerMessage = z.infer<typeof A2UIServerMessageSchema>;
export declare const A2UIUserActionSchema: z.ZodObject<{
    type: z.ZodLiteral<"userAction">;
    surfaceId: z.ZodString;
    componentId: z.ZodString;
    action: z.ZodString;
    value: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "userAction";
    surfaceId: string;
    componentId: string;
    action: string;
    value?: unknown;
}, {
    type: "userAction";
    surfaceId: string;
    componentId: string;
    action: string;
    value?: unknown;
}>;
export type A2UIUserAction = z.infer<typeof A2UIUserActionSchema>;
/** Union of all A2UI messages (server + client). */
export declare const A2UIMessageSchema: z.ZodUnion<[z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"beginRendering">;
    surfaceId: z.ZodString;
    rootComponentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}, {
    type: "beginRendering";
    surfaceId: string;
    rootComponentId: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"surfaceUpdate">;
    surfaceId: z.ZodString;
    components: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "button", "row", "column", "card", "list", "list_item", "text_field", "checkbox", "radio_group", "radio_option", "select", "select_option", "date_input", "divider", "image", "link", "spacer"]>;
        properties: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        childIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }, {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties: Record<string, unknown>;
        childIds: string[];
    }[];
}, {
    type: "surfaceUpdate";
    surfaceId: string;
    components: {
        type: "text" | "button" | "row" | "column" | "card" | "list" | "list_item" | "text_field" | "checkbox" | "radio_group" | "radio_option" | "select" | "select_option" | "date_input" | "divider" | "image" | "link" | "spacer";
        id: string;
        properties?: Record<string, unknown> | undefined;
        childIds?: string[] | undefined;
    }[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"dataModelUpdate">;
    surfaceId: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}, {
    type: "dataModelUpdate";
    surfaceId: string;
    data: Record<string, unknown>;
}>, z.ZodObject<{
    type: z.ZodLiteral<"deleteSurface">;
    surfaceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "deleteSurface";
    surfaceId: string;
}, {
    type: "deleteSurface";
    surfaceId: string;
}>]>, z.ZodObject<{
    type: z.ZodLiteral<"userAction">;
    surfaceId: z.ZodString;
    componentId: z.ZodString;
    action: z.ZodString;
    value: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "userAction";
    surfaceId: string;
    componentId: string;
    action: string;
    value?: unknown;
}, {
    type: "userAction";
    surfaceId: string;
    componentId: string;
    action: string;
    value?: unknown;
}>]>;
export type A2UIMessage = z.infer<typeof A2UIMessageSchema>;
export declare const A2UI_CONTENT_TYPE: "application/a2ui+jsonl";
//# sourceMappingURL=a2ui.d.ts.map