import type { WorkflowNodeDef } from "./types";

const selectInputStep: WorkflowNodeDef = {
    type: "selectInput",
    label: "Select",
    description: "A dropdown field — place it in a View to add it as a form select",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        { key: "name", label: "Field name", kind: "text", placeholder: "e.g. plan" },
        { key: "label", label: "Label", kind: "text", placeholder: "Display text" },
        {
            key: "options",
            label: 'Options (JSON) — [{"value": "monthly", "label": "Monthly"}]',
            kind: "textarea",
            placeholder: '[{"value": "monthly", "label": "Monthly"}]',
        },
    ],
    defaultData: () => ({ name: "", label: "", options: JSON.stringify([{ value: "", label: "Choose one" }], null, 2) }),
    summarize: (data) => {
        const name = data?.name ?? "";
        const label = data?.label ?? "";
        return name ? `Select: ${name}` : label ? `Select: ${label}` : "Select input";
    },
};

export default selectInputStep;
