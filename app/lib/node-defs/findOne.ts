import type { ModuleNodeDef } from "./types";

const findOneNode: ModuleNodeDef = {
    type: "findOne",
    label: "Find One",
    description: "Get first document — chain from List (gets first from DB) or from Find/Match (gets first from filtered results)",
    color: "#0369a1",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "First document",
    inspectorNote: () => ({
        label: "Tip",
        value:
            "Two modes: (1) Chain from List → gets first document from database, or (2) Chain from Find/Match → gets first document from filtered results. Example: List → Find → Match → Find One gets first matching document. Passes the found record's fields to the next node. Returns null if no documents found.",
    }),
};

export default findOneNode;
