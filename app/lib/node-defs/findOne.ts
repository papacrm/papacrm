import type { ModuleNodeDef } from "./types";

const findOneNode: ModuleNodeDef = {
    type: "findOne",
    label: "Find One",
    description: "Looks up a single record from a list with a simple filter — accepts list from input (chain a List or List (create if not exists) node to the left)",
    color: "#0369a1",
    kind: "action",
    fields: [
        { key: "whereField", label: "Where field (optional)", kind: "text", placeholder: "email" },
        {
            key: "whereOperator",
            label: "Operator",
            kind: "select",
            options: [
                { value: "equals", label: "Equals" },
                { value: "notEquals", label: "Not equals" },
                { value: "contains", label: "Contains" },
            ],
        },
        { key: "whereValue", label: "Where value", kind: "text", placeholder: "{{email}}" },
        {
            key: "mode",
            label: "Mode",
            kind: "select",
            options: [
                { value: "replace", label: "Replace data with the found record" },
                { value: "merge", label: "Merge found record into existing data" },
            ],
        },
    ],
    defaultData: () => ({ whereField: "", whereOperator: "equals", whereValue: "", mode: "replace" }),
    summarize: (data) => {
        return data?.whereField
            ? `First where ${data.whereField} ${data.whereOperator ?? "equals"} ${data.whereValue ?? ""}`
            : "First document from input list";
    },
    inspectorNote: () => ({
        label: "Tip",
        value:
            "Chain a List or List (create if not exists) node to the left. Passes the found record's own fields to the next node, so {{field}} reads them the same way a submitted form's fields would. No match: in Replace mode the next node gets null; in Merge mode whatever was already there passes through untouched.",
    }),
};

export default findOneNode;
