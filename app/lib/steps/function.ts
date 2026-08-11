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
    fields: [{ key: "description", label: "Description (optional)", kind: "text", placeholder: "What does this workflow do when called?" }],
    defaultData: () => ({ description: "" }),
    summarize: (data) => (data?.description ? String(data.description) : "Callable from another workflow"),
};

export default functionStep;
