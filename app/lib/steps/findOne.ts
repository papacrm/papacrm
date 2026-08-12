import type { WorkflowNodeDef } from "./types";

const findOneStep: WorkflowNodeDef = {
    type: "findOne",
    label: "Find One",
    description: "Looks up a single record from one of your Lists by name, with a simple filter",
    color: "#0369a1",
    kind: "action",
    fields: [
        { key: "listName", label: "List name", kind: "text", placeholder: "Customers" },
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
    defaultData: () => ({ listName: "", whereField: "", whereOperator: "equals", whereValue: "", mode: "replace" }),
    summarize: (data) =>
        !data?.listName
            ? "No list name set"
            : data?.whereField
              ? `First of ${data.listName} where ${data.whereField} ${data.whereOperator ?? "equals"} ${data.whereValue ?? ""}`
              : `First of ${data.listName}`,
    inspectorNote: () => ({
        label: "Tip",
        value: "Passes the found record's own fields to the next step, so {{field}} reads them the same way a submitted form's fields would. No match just means those lookups come back empty.",
    }),
};

export default findOneStep;
