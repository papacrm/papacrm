import type { ModuleNodeDef } from "./types";

const listNode: ModuleNodeDef = {
    type: "list",
    label: "List",
    description: "Get all documents from a list — chain to Find One, Save to List, Match, Project, Sort, Count, etc. This node doesn't need input from the left.",
    color: "#6366f1",
    kind: "trigger",
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
        return list ? `List: documents & metadata` : "No list selected";
    },
    inspectorNote: () => ({
        label: "Tip",
        value: "This node doesn't require input from the left — it's a source node. Chain it to nodes like Find One, Save to List, Match, Sort, or other list-processing nodes.",
    }),
};

export default listNode;
