import type { WorkflowNodeDef } from "./types";

const skipStep: WorkflowNodeDef = {
    type: "skip",
    label: "Skip",
    description: "Skip documents — chain from Find or another pipeline step",
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
    defaultData: () => ({ count: "0" }),
    summarize: (data) => {
        const count = data?.count ?? "";
        return count ? `Skip ${count}` : "No skip set";
    },
};

export default skipStep;
