import type { WorkflowNodeDef } from "./types";

const functionStep: WorkflowNodeDef = {
    type: "function",
    label: "Function",
    description: "Entry point for a workflow that's called by another workflow's Call step, instead of a public URL",
    color: "#4f46e5",
    // Same visual role as Webhook (no input handle — this is where a run
    // starts) but it's never reachable at a public URL: only a Call step
    // naming this workflow can start a run here. See lib/steps/function.ts.
    kind: "trigger",
    fields: [
        { key: "name", label: "Name", kind: "text", placeholder: "sendWelcomeEmail" },
        {
            key: "visibility",
            label: "Visibility",
            kind: "select",
            // Private functions can only be reached by a Call step inside
            // the same workflow ("A function in this workflow"). Public
            // functions can also be reached by Call steps in *other*
            // workflows — see app/router/workflows.ts (listCallable) and
            // lib/steps/call.ts, which both gate on this field.
            options: [
                { value: "private", label: "Private — only callable from this workflow" },
                { value: "public", label: "Public — callable from other workflows too" },
            ],
        },
    ],
    defaultData: () => ({ name: "", visibility: "private" }),
    summarize: (data) => {
        const name = data?.name ? String(data.name) : "Unnamed function";
        return `${name} · ${data?.visibility === "public" ? "Public" : "Private"}`;
    },
};

export default functionStep;
