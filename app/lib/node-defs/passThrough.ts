import type { ModuleNodeDef } from "./types";

// A pure relay: whatever's on ctx.body when this node is reached goes to
// its next node completely unchanged. No fields, nothing to configure —
// it exists purely so a chain can explicitly say "hand this data along"
// at a point in the graph, e.g. a branch of a fan-out that doesn't
// otherwise touch the data but still needs to carry it forward.
const passThroughNode: ModuleNodeDef = {
    type: "passThrough",
    label: "Pass data through",
    description: "Forwards whatever data is currently on the chain to the next node, completely unchanged. Use this any time you need to pass data from one point in the module to another.",
    color: "#64748b",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Forwards data unchanged",
};

export default passThroughNode;
