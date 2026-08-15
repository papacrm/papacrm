// Shared contracts for module nodes. Each node type (webhook, condition,
// etc.) lives in its own file in this folder and exports one ModuleNodeDef
// — that's the only thing the editor needs to know about it. To add a new
// node: create `mySte.ts` here, then register it in `index.ts`.

export type ModuleNodeType =
    | "webhook"
    | "staticPage"
    | "httpRequest"
    | "condition"
    | "inputForm"
    | "saveRecord"
    | "saveToList"
    | "mapper"
    | "function"
    | "call"
    | "route"
    | "forward"
    | "findOne"
    | "table"
    | "listView"
    | "card"
    | "container"
    | "query"
    | "setCookie"
    | "getCookie"
    | "getHeader"
    | "setHeader"
    | "jwtVerify"
    | "jwtSign"
    | "menu"
    | "tabs"
    | "navbar"
    | "footer"
    | "view"
    | "gap"
    | "json"
    | "html"
    | "css"
    | "state"
    | "label"
    | "link"
    | "div"
    | "class"
    | "textInput"
    | "checkboxInput"
    | "textareaInput"
    | "numberInput"
    | "find"
    | "match"
    | "project"
    | "sort"
    | "limit"
    | "skip"
    | "list"
    | "count"
    | "distinct"
    | "delay"
    | "random"
    | "text"
    | "image"
    | "selectInput";

// Groups nodes in the editor's palette (see ModuleEditor.tsx). Purely a
// UI grouping — has no effect on execution. To add a new category, add it
// here and give it an entry in CATEGORY_META in index.ts.
export type ModuleNodeCategory = "triggers" | "data" | "logic" | "requests" | "responses" | "blocks" | "forms";

export interface ModuleNode {
    id: string;
    type: ModuleNodeType;
    x: number;
    y: number;
    data: Record<string, any>;
}

export interface ModuleEdge {
    id: string;
    source: string;
    sourceHandle: string | null;
    target: string;
}

export interface ModuleField {
    key: string;
    label: string;
    kind: "text" | "textarea" | "select" | "html" | "toggle";
    placeholder?: string;
    options?: { value: string; label: string }[];
    // For "select" fields whose options can't be known statically (e.g.
    // "pick one of your Lists") — the editor fetches the real options at
    // render time and uses those instead of `options` above. "modules"
    // backs Call's "Module" picker the same way "lists" backs Save to
    // List's — see ModuleEditor's dynamicOptions handling.
    dynamicOptions?: "lists" | "modules";
}

export interface InspectorNote {
    label: string;
    value: string;
    warning?: string;
}

export interface InspectorNoteContext {
    // Origin of the app (e.g. https://myapp.com), used to build full
    // public URLs for trigger-style nodes. Empty until the editor has
    // mounted client-side.
    origin: string;
    active: boolean;
}

export interface ModuleNodeDef {
    type: ModuleNodeType;
    label: string;
    description: string;
    color: string;
    // Trigger nodes have no input handle; terminal nodes have no output
    // handle. "branch" nodes have two labelled outputs instead of one.
    kind: "trigger" | "action" | "terminal" | "branch";
    fields: ModuleField[];
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

// Shared by any node that's addressable at /<path> (webhook, inputForm,
// ...) — shows the public URL in the inspector once the editor has
// mounted, plus a nudge to activate the module.
export function publicHookNote(data: Record<string, any>, ctx: InspectorNoteContext): InspectorNote | null {
    if (!ctx.origin) return null;
    const warning = !ctx.active
        ? "Save and mark this module Active for the URL to respond."
        : data?.active === false
          ? "This node is Inactive — save to stop the URL from responding."
          : undefined;
    return {
        label: "Public URL",
        value: `${ctx.origin}/${data?.path || ""}`,
        warning,
    };
}