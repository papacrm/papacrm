import type { WorkflowNodeDef } from "./types";

const countStep: WorkflowNodeDef = {
    type: "count",
    label: "Count",
    description: "Count documents from a list or previous step",
    color: "#ec4899",
    kind: "action",
    fields: [
        {
            key: "list",
            label: "List (optional)",
            kind: "select",
            dynamicOptions: "lists",
        },
        {
            key: "match",
            label: "Match filter (JSON, optional)",
            kind: "textarea",
            placeholder: '{"status": "active"}',
        },
    ],
    defaultData: () => ({ list: "", match: "" }),
    summarize: (data) => {
        if (data?.list) {
            return data?.match ? "Count with filter" : "Count all";
        }
        return "Count from previous step";
    },
};

export default countStep;
