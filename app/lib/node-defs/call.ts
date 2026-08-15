import type { ModuleNodeDef } from "./types";

// Wire a View's own output straight into a Call node (instead of into
// another View) and the Call node calling a shared layout's Function
// renders that View *inside* the layout — see the "slot" doc in
// lib/nodes/view.ts's ViewBlock type and how callNode.run() (server) picks
// up ctx.viewOutput. Build the shared layout once as its own View (Navbar,
// Footer, etc.) with a Function wired into it as a content slot, then
// route every page's View through a Call node aimed at that Function.
const callNode: ModuleNodeDef = {
    type: "call",
    label: "Call",
    description: "Runs a Function node — in this module or another one — and continues here with its result",
    color: "#0f766e",
    kind: "action",
    // No generic fields: picking "this module vs. another module" and
    // then the specific Function is a cascading, data-dependent choice
    // (which functions exist depends on which module is picked, and the
    // "other module" list itself has to be fetched and filtered server
    // side — see app/router/modules.ts's `listCallable`). The editor
    // renders a dedicated picker for the `call` node type instead of
    // iterating `fields` — see ModuleEditor.tsx.
    fields: [],
    // `scope` is "internal" (a Function node elsewhere in *this* module)
    // or "external" (a public Function node in another of the person's
    // modules). `moduleName`/`functionName` are denormalized copies of
    // the picked target's display name, stored purely so the node card and
    // this summary can show something readable without re-fetching.
    defaultData: () => ({ scope: "internal", moduleId: "", moduleName: "", functionId: "", functionName: "" }),
    summarize: (data) => {
        if (!data?.functionId) return "No function selected";
        const name = data?.functionName || "function";
        if (data?.scope === "external") {
            return data?.moduleName ? `Calls ${name} in ${data.moduleName}` : `Calls ${name}`;
        }
        return `Calls ${name} (this module)`;
    },
    inspectorNote: (data) =>
        data?.functionId
            ? {
                  label: "Chaining",
                  value: "If a node follows this one, it receives the called function's result. Otherwise that result is returned directly. If a View feeds into this node instead, that View renders inside whatever layout the called function belongs to.",
              }
            : {
                  label: "Tip",
                  value: "Pick a Function node to call — in this module, or a public one in another module.",
              },
};

export default callNode;
