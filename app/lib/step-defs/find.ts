import type { WorkflowNodeDef } from "./types";

const findStep: WorkflowNodeDef = {
    type: "find",
    label: "Find",
    description: "Query a list — chain to Match, Project, Sort, Limit, or Skip",
    color: "#6366f1",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Find",
};

export default findStep;
