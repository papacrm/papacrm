import type { WorkflowNodeDef } from "./types";

const numberInputStep: WorkflowNodeDef = {
    type: "numberInput",
    label: "Number",
    description: "A number input field — place it in a View to add it as a form input",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "name",
            label: "Field name",
            kind: "text",
            placeholder: "e.g. quantity",
        },
        {
            key: "label",
            label: "Label",
            kind: "text",
            placeholder: "Display text",
        },
        {
            key: "placeholder",
            label: "Placeholder",
            kind: "text",
            placeholder: "e.g. 0",
        },
    ],
    defaultData: () => ({ name: "", label: "", placeholder: "" }),
    summarize: (data) => {
        const name = data?.name ?? "";
        const label = data?.label ?? "";
        return name ? `Number: ${name}` : label ? `Number: ${label}` : "Number input";
    },
};

export default numberInputStep;
