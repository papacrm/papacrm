import type { ModuleNodeDef } from "./types";

const textareaInputNode: ModuleNodeDef = {
    type: "textareaInput",
    label: "Textarea",
    description: "A multi-line text field — place it in a View to add it as a form textarea",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "name",
            label: "Field name",
            kind: "text",
            placeholder: "e.g. message",
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
            placeholder: "e.g. Enter your message…",
        },
    ],
    defaultData: () => ({ name: "", label: "", placeholder: "" }),
    summarize: (data) => {
        const name = data?.name ?? "";
        const label = data?.label ?? "";
        return name ? `Textarea: ${name}` : label ? `Textarea: ${label}` : "Textarea";
    },
};

export default textareaInputNode;
