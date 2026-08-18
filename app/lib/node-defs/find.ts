import type { ModuleNodeDef } from "./types";

const findNode: ModuleNodeDef = {
    type: "find",
    label: "Find",
    description: "Query a list — accepts list from input (chain a List or List (create if not exists) node to the left), then chain to Match, Project, Sort, Limit, or Skip",
    color: "#6366f1",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Find documents from input list",
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain a List or List (create if not exists) node to the left of this one — the list it provides is what Find will query.",
    }),
};

export default findNode;
