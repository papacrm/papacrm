import type { WorkflowNodeDef } from "./types";

// Wire a View's own output straight into a Call step (instead of into
// another View) and the Call step calling a shared layout's Function
// renders that View *inside* the layout — see the "slot" doc in
// lib/steps/view.ts's ViewBlock type and how callStep.run() (server) picks
// up ctx.viewOutput. Build the shared layout once as its own View (Navbar,
// Footer, etc.) with a Function wired into it as a content slot, then
// route every page's View through a Call step aimed at that Function.
const callStep: WorkflowNodeDef = {
    type: "call",
    label: "Call",
    description: "Runs a Function step — in this workflow or another one — and continues here with its result",
    color: "#0f766e",
    kind: "action",
    // No generic fields: picking "this workflow vs. another workflow" and
    // then the specific Function is a cascading, data-dependent choice
    // (which functions exist depends on which workflow is picked, and the
    // "other workflow" list itself has to be fetched and filtered server
    // side — see app/router/workflows.ts's `listCallable`). The editor
    // renders a dedicated picker for the `call` node type instead of
    // iterating `fields` — see WorkflowEditor.tsx.
    fields: [],
    // `scope` is "internal" (a Function step elsewhere in *this* workflow)
    // or "external" (a public Function step in another of the person's
    // workflows). `workflowName`/`functionName` are denormalized copies of
    // the picked target's display name, stored purely so the node card and
    // this summary can show something readable without re-fetching.
    defaultData: () => ({ scope: "internal", workflowId: "", workflowName: "", functionId: "", functionName: "" }),
    summarize: (data) => {
        if (!data?.functionId) return "No function selected";
        const name = data?.functionName || "function";
        if (data?.scope === "external") {
            return data?.workflowName ? `Calls ${name} in ${data.workflowName}` : `Calls ${name}`;
        }
        return `Calls ${name} (this workflow)`;
    },
    inspectorNote: (data) =>
        data?.functionId
            ? {
                  label: "Chaining",
                  value: "If a step follows this one, it receives the called function's result. Otherwise that result is returned directly. If a View feeds into this step instead, that View renders inside whatever layout the called function belongs to.",
              }
            : {
                  label: "Tip",
                  value: "Pick a Function step to call — in this workflow, or a public one in another workflow.",
              },
};

export default callStep;
