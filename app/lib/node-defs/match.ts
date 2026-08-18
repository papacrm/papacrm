import type { ModuleNodeDef } from "./types";

const matchNode: ModuleNodeDef = {
    type: "match",
    label: "Match",
    description: 'Filter documents by conditions — chain from Find to filter results. Supports exact values or operators: $gt, $gte, $lt, $lte, $ne, $eq, $in, $nin, $exists, $regex. Keys must be quoted (valid JSON), e.g. {"age": {"$gt": 3}}.',
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "query",
            label: "Query (JSON)",
            kind: "textarea",
            placeholder: '{"status": "active", "age": {"$gt": 3}}',
        },
    ],
    defaultData: () => ({ query: "{}" }),
    summarize: (data) => {
        const query = data?.query ?? "";
        return query && query !== "{}" ? "Filter by condition" : "No filter set";
    },
};

export default matchNode;
