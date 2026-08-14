import type { WorkflowNodeDef } from "./types";

const textInputStep: WorkflowNodeDef = {
    type: "textInput",
    label: "Text Input",
    description: "A text input field — place it in a View to add it as a form input",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "name",
            label: "Field name",
            kind: "text",
            placeholder: "e.g. email",
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
            placeholder: "e.g. Enter your name…",
        },
    ],
    defaultData: () => ({ name: "", label: "", placeholder: "" }),
    summarize: (data) => {
        const name = data?.name ?? "";
        const label = data?.label ?? "";
        return name ? `Input: ${name}` : label ? `Input: ${label}` : "Text input";
    },
};

export default textInputStep;
