import type { ModuleNodeDef } from "./types";

const queryNode: ModuleNodeDef = {
    type: "query",
    label: "Query",
    description: "Looks up records from one of your Lists by name, with a simple filter",
    color: "#0e7490",
    kind: "action",
    fields: [
        { key: "listName", label: "List name", kind: "text", placeholder: "Customers" },
        { key: "whereField", label: "Where field (optional)", kind: "text", placeholder: "status" },
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
        { key: "whereValue", label: "Where value", kind: "text", placeholder: "active" },
    ],
    defaultData: () => ({ listName: "", whereField: "", whereOperator: "equals", whereValue: "" }),
    summarize: (data) =>
        !data?.listName
            ? "No list name set"
            : data?.whereField
              ? `${data.listName} where ${data.whereField} ${data.whereOperator ?? "equals"} ${data.whereValue ?? ""}`
              : `All of ${data.listName}`,
    inspectorNote: () => ({
        label: "Tip",
        value: "Passes the matching records to the next node as data — wire this into a Table node to display them.",
    }),
};

export default queryNode;