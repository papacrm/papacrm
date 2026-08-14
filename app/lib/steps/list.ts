import type { WorkflowNodeDef } from "./types";

const listStep: WorkflowNodeDef = {
    type: "list",
    label: "List",
    description: "Get all documents from a list — chain to Match, Project, Sort, Count, etc.",
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
        return list ? `List: documents` : "No list selected";
    },
};

export default listStep;
