// Shared contracts for workflow steps. Each step type (webhook, condition,
// etc.) lives in its own file in this folder and exports one WorkflowNodeDef
// — that's the only thing the editor needs to know about it. To add a new
// step: create `mySte.ts` here, then register it in `index.ts`.

export type WorkflowNodeType = "webhook" | "staticPage" | "httpRequest" | "condition" | "inputForm" | "saveRecord" | "saveToList" | "mapper";

export interface WorkflowNode {
    id: string;
    type: WorkflowNodeType;
    x: number;
    y: number;
    data: Record<string, any>;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    sourceHandle: string | null;
    target: string;
}

export interface WorkflowField {
    key: string;
    label: string;
    kind: "text" | "textarea" | "select";
    placeholder?: string;
    options?: { value: string; label: string }[];
    // For "select" fields whose options can't be known statically (e.g.
    // "pick one of your Lists") — the editor fetches the real options at
    // render time and uses those instead of `options` above.
    dynamicOptions?: "lists";
}

export interface InspectorNote {
    label: string;
    value: string;
    warning?: string;
}

export interface InspectorNoteContext {
    // Origin of the app (e.g. https://myapp.com), used to build full
    // public URLs for trigger-style steps. Empty until the editor has
    // mounted client-side.
    origin: string;
    active: boolean;
}

export interface WorkflowNodeDef {
    type: WorkflowNodeType;
    label: string;
    description: string;
    color: string;
    // Trigger nodes have no input handle; terminal nodes have no output
    // handle. "branch" nodes have two labelled outputs instead of one.
    kind: "trigger" | "action" | "terminal" | "branch";
    fields: WorkflowField[];
    defaultData: () => Record<string, any>;
    // One-line summary shown on the node card in the canvas.
    summarize: (data: Record<string, any>) => string;
    // Optional extra read-only info shown in the inspector below the
    // fields (e.g. the public webhook URL). Return null to show nothing.
    inspectorNote?: (data: Record<string, any>, ctx: InspectorNoteContext) => InspectorNote | null;
}

export function randomSlug(): string {
    return Math.random().toString(36).slice(2, 8);
}

// Shared by any step that's addressable at /<path> (webhook, inputForm,
// ...) — shows the public URL in the inspector once the editor has
// mounted, plus a nudge to activate the workflow.
export function publicHookNote(data: Record<string, any>, ctx: InspectorNoteContext): InspectorNote | null {
    if (!ctx.origin) return null;
    return {
        label: "Public URL",
        value: `${ctx.origin}/${data?.path || ""}`,
        warning: ctx.active ? undefined : "Save and mark this workflow Active for the URL to respond.",
    };
}