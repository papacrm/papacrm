import type { ModuleNodeDef } from "./types";

const findNode: ModuleNodeDef = {
    type: "find",
    label: "Find",
    description: "Get all documents from a list — accepts list from input (chain a List or List (create if not exists) node to the left), then chain to Match for filtering",
    color: "#6366f1",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Find all documents",
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain a List or List (create if not exists) node to the left. To filter documents, chain a Match node after this. For field selection, use Project.",
    }),
};

export default findNode;
