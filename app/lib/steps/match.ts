import type { WorkflowNodeDef } from "./types";

const matchStep: WorkflowNodeDef = {
    type: "match",
    label: "Match",
    description: "Filter documents — chain from Find",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "query",
            label: "Query (JSON)",
            kind: "textarea",
            placeholder: '{"status": "active"}',
        },
    ],
    defaultData: () => ({ query: "{}" }),
    summarize: (data) => {
        const query = data?.query ?? "";
        return query && query !== "{}" ? "Filter documents" : "No filter set";
    },
};

export default matchStep;
