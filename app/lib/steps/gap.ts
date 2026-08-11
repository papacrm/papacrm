import type { WorkflowNodeDef } from "./types";

const gapStep: WorkflowNodeDef = {
    type: "gap",
    label: "Gap",
    description: "Empty space — connect it into a View to add breathing room between blocks",
    color: "#a8a29e",
    kind: "action",
    fields: [{ key: "size", label: "Height (px)", kind: "text", placeholder: "48" }],
    defaultData: () => ({ size: "48" }),
    summarize: (data) => `${data?.size || "48"}px`,
};

export default gapStep;
