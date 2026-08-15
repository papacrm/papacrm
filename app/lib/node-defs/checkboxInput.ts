import type { ModuleNodeDef } from "./types";

const checkboxInputNode: ModuleNodeDef = {
    type: "checkboxInput",
    label: "Checkbox",
    description: "A checkbox — place it in a View to add it as a form checkbox",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "name",
            label: "Field name",
            kind: "text",
            placeholder: "e.g. agreed",
        },
        {
            key: "label",
            label: "Label",
            kind: "text",
            placeholder: "e.g. I agree to terms",
        },
    ],
    defaultData: () => ({ name: "", label: "" }),
    summarize: (data) => {
        const name = data?.name ?? "";
        const label = data?.label ?? "";
        return name ? `Checkbox: ${name}` : label ? `Checkbox: ${label}` : "Checkbox";
    },
};

export default checkboxInputNode;
