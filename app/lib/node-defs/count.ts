import type { ModuleNodeDef } from "./types";

const countNode: ModuleNodeDef = {
    type: "count",
    label: "Count",
    description: "Count documents — chain from List to count every document in a list, or from Find / Find → Match / Find One to count whatever those returned.",
    color: "#ec4899",
    kind: "action",
    fields: [{ key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "count" }],
    defaultData: () => ({ as: "count" }),
    summarize: (data) => `Count documents → ${data?.as?.trim() || "count"}`,
};

export default countNode;
