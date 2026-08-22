import type { ModuleNodeDef } from "./types";

// Field/Number (one input) and the per-input "sumFields" map (2+ inputs)
// are rendered entirely in ModuleEditor.tsx (see the `selectedNode.type
// === "add"` block there) since which UI applies depends on how many
// nodes are actually wired into this one — "as" is the only field simple
// enough to live in this generic list.
const addNode: ModuleNodeDef = {
    type: "add",
    label: "Add",
    description:
        "Adds numbers together and saves the result. With one input wired in, reads a number from it (optionally via a specific field) and adds a literal number to it. With two or more inputs, it sums one field per input — set per-input in the inspector — using whatever each has produced by the time Add runs, without waiting for all of them.",
    color: "#65a30d",
    kind: "action",
    fields: [{ key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "sum" }],
    defaultData: () => ({ as: "sum", field: "", number: "", sumFields: {} }),
    summarize: (data) => (data?.as ? `Add → ${data.as}` : "No field name set"),
};

export default addNode;
