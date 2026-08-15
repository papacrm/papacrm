import type { ModuleNodeDef } from "./types";

const distinctNode: ModuleNodeDef = {
    type: "distinct",
    label: "Distinct",
    description: "Reduce documents to the unique values of one field — chain from Find, List, or another pipeline node",
    color: "#6366f1",
    kind: "action",
    fields: [{ key: "field", label: "Field", kind: "text", placeholder: "email" }],
    defaultData: () => ({ field: "" }),
    summarize: (data) => (data?.field ? `Unique ${data.field}` : "No field set"),
};

export default distinctNode;
