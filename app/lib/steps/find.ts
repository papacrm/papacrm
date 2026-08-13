import type { WorkflowNodeDef } from "./types";

const findStep: WorkflowNodeDef = {
    type: "find",
    label: "Find",
    description: "Query a list — chain to Match, Project, Sort, Limit, or Skip",
    color: "#6366f1",
    kind: "action",
    fields: [
        {
            key: "list",
            label: "List",
            kind: "select",
            dynamicOptions: "lists",
        },
    ],
    defaultData: () => ({ list: "" }),
    summarize: (data) => {
        const list = data?.list ?? "";
        return list ? `Find from list` : "No list selected";
    },
};

export default findStep;
