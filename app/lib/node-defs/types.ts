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
    | "updateOne"
    | "update"
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
    | "style"
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
    | "listUpsert"
    | "count"
    | "distinct"
    | "delay"
    | "random"
    | "now"
    | "add"
    | "env"
    | "text"
    | "image"
    | "selectInput"
    | "consoleLog"
    | "passThrough"
    | "box"
    | "comment";

// Groups nodes in the editor's palette (see ModuleEditor.tsx). Purely a
// UI grouping — has no effect on execution. To add a new category, add it
// here and give it an entry in CATEGORY_META in index.ts.
export type ModuleNodeCategory = "triggers" | "data" | "logic" | "requests" | "responses" | "blocks" | "forms" | "notes";

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
    // "workflow" (the default — omitted/undefined edges are workflow
    // edges too, so existing saved modules don't need a migration) is a
    // normal connection: reaching the source's end of it runs the
    // target, exactly as edges always have. "data" is a supply-only
    // connection: it never triggers the target on its own — instead,
    // whenever the target *does* run (via one of its workflow edges),
    // the engine looks up whatever that data edge's source last
    // produced and merges those fields onto the target's incoming body
    // first (see NodeContext.nodeOutputs and the merge step in
    // moduleEngine.ts's executeAndContinue). This replaces the old
    // per-node "Multiple inputs: Continue/Wait" join picker — a node
    // no longer needs to wait for every predecessor, it just runs
    // whenever a workflow edge reaches it and picks up whatever data
    // edges have already produced by then. On a field-name collision
    // between the incoming body and a data edge (or between two data
    // edges), the data edge's value wins — same "last one wins" spirit
    // the old Wait-join merge had, just without needing to wait.
    edgeType?: "workflow" | "data";
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
    // backs Call's "Module" picker the same way "lists" backs List's and
    // Count's "List" picker — see ModuleEditor's dynamicOptions handling.
    // Save to List used to have a "lists" field here too, but no longer
    // does — it reads its target list off the previous node's data at
    // runtime instead (see lib-server/nodes/saveToList.ts).
    // "findFields" backs the field-selection checkboxes used by Project
    // (reading the list off a chained Find node), by Pass Through's
    // "Fields to keep" (same lookup, but purely as a snapshot — see
    // lib-server/nodes/passThrough.ts — it never filters anything the
    // way Project does), and by Find and Find One themselves (reading
    // their own list) — see ModuleEditor's dynamicOptions handling.
    dynamicOptions?: "lists" | "modules" | "findFields";
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
    // "annotation" nodes (Group Box, Comment) have no handles at all —
    // they're canvas-only decoration, never wired into the flow and
    // never executed. See ModuleEditor.tsx's node card rendering and
    // lib-server/nodes/box.ts / comment.ts (unreachable no-op stubs).
    kind: "trigger" | "action" | "terminal" | "branch" | "annotation";
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