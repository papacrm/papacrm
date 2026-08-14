import type { WorkflowNodeDef } from "./types";

const labelStep: WorkflowNodeDef = {
    type: "label",
    label: "Label",
    description: "Display a field value — connect it into a View to show it as a text block",
    color: "#06b6d4",
    kind: "action",
    fields: [
        {
            key: "field",
            label: "Field",
            kind: "text",
            placeholder: "{{ fieldName }} or {{ nested.field }}",
        },
    ],
    defaultData: () => ({ field: "" }),
    summarize: (data) => {
        const field = data?.field ?? "";
        return field ? `Show: ${field}` : "No field set";
    },
};

export default labelStep;
