import type { WorkflowNodeDef } from "./types";

const limitStep: WorkflowNodeDef = {
    type: "limit",
    label: "Limit",
    description: "Limit documents — chain from Find or another pipeline step",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "count",
            label: "Count",
            kind: "text",
            placeholder: "10",
        },
    ],
    defaultData: () => ({ count: "10" }),
    summarize: (data) => {
        const count = data?.count ?? "";
        return count ? `Limit to ${count}` : "No limit set";
    },
};

export default limitStep;
