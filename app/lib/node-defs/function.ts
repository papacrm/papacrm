import type { ModuleNodeDef } from "./types";

const functionNode: ModuleNodeDef = {
    type: "function",
    label: "Function",
    description: "Entry point for a module that's called by another module's Call node, instead of a public URL",
    color: "#4f46e5",
    // Same visual role as Webhook (no input handle — this is where a run
    // starts) but it's never reachable at a public URL: only a Call node
    // naming this module can start a run here. See lib/nodes/function.ts.
    kind: "trigger",
    fields: [
        { key: "name", label: "Name", kind: "text", placeholder: "sendWelcomeEmail" },
        {
            key: "visibility",
            label: "Visibility",
            kind: "select",
            // Private functions can only be reached by a Call node inside
            // the same module ("A function in this module"). Public
            // functions can also be reached by Call nodes in *other*
            // modules — see app/router/modules.ts (listCallable) and
            // lib/nodes/call.ts, which both gate on this field.
            options: [
                { value: "private", label: "Private — only callable from this module" },
                { value: "public", label: "Public — callable from other modules too" },
            ],
        },
    ],
    defaultData: () => ({ name: "", visibility: "private" }),
    summarize: (data) => {
        const name = data?.name ? String(data.name) : "Unnamed function";
        return `${name} · ${data?.visibility === "public" ? "Public" : "Private"}`;
    },
};

export default functionNode;
