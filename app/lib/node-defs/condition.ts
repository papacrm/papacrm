import type { ModuleNodeDef } from "./types";

const conditionNode: ModuleNodeDef = {
    type: "condition",
    label: "Condition",
    description: "Branches the module based on a value. \"Pass data through\" controls whether the chosen branch's next node gets the current data as-is, or a clean empty object.",
    color: "#d97706",
    kind: "branch",
    fields: [
        { key: "field", label: "Field (e.g. body.status)", kind: "text", placeholder: "body.status" },
        {
            key: "operator",
            label: "Operator",
            kind: "select",
            options: [
                { value: "equals", label: "Equals" },
                { value: "notEquals", label: "Not equals" },
                { value: "contains", label: "Contains" },
                { value: "exists", label: "Exists" },
            ],
        },
        { key: "value", label: "Value", kind: "text", placeholder: "ok" },
        {
            key: "passInput",
            label: "Pass data through",
            kind: "toggle",
        },
    ],
    defaultData: () => ({ field: "", operator: "equals", value: "", passInput: true }),
    summarize: (data) =>
        data?.field
            ? `${data.field} ${data.operator ?? "equals"} ${data.value ?? ""}${data?.passInput === false ? " (clears data)" : ""}`
            : "no field set",
};

export default conditionNode;
