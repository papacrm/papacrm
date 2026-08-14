import type { WorkflowNodeDef } from "./types";

const DEFAULT_BLOCKS = [
    { type: "table", heading: "Recent submissions", listId: "" },
    { type: "form", heading: "Add one", fields: [{ name: "email", label: "Email", type: "email" }], submitLabel: "Submit" },
];

const containerStep: WorkflowNodeDef = {
    type: "container",
    label: "Container",
    description: "Combines multiple blocks — a table, a form, or static HTML — into one page",
    color: "#9333ea",
    // Same reasoning as Input Form: a Form block posts back to whatever
    // URL got the person here, so this needs both an input handle (to be
    // reached, e.g. from a Webhook) and an output handle (to continue the
    // chain once that form is submitted).
    kind: "action",
    fields: [
        { key: "title", label: "Page title", kind: "text", placeholder: "Dashboard" },
        {
            key: "blocks",
            label: 'Blocks (JSON array) — {"type":"table","listId":"…"}, {"type":"form","fields":[…],"submitLabel":"…"}, or {"type":"html","html":"…"}. Add "heading" to any block.',
            kind: "textarea",
            placeholder: JSON.stringify(DEFAULT_BLOCKS, null, 2),
        },
    ],
    defaultData: () => ({ title: "Dashboard", blocks: JSON.stringify(DEFAULT_BLOCKS, null, 2) }),
    summarize: (data) => {
        try {
            const blocks = JSON.parse(data?.blocks ?? "[]");
            if (!Array.isArray(blocks) || blocks.length === 0) return "No blocks set";
            return `${blocks.length} block${blocks.length === 1 ? "" : "s"}: ${blocks.map((b: any) => b?.type ?? "?").join(", ")}`;
        } catch {
            return "Invalid blocks JSON";
        }
    },
    inspectorNote: () => ({
        label: "Tip",
        value: 'A table block\'s "listId" is a List\'s id — copy it from that List\'s page. Only the first form block in a Container is interactive.',
    }),
};

export default containerStep;
