import type { WorkflowNodeDef } from "./types";

const delayStep: WorkflowNodeDef = {
    type: "delay",
    label: "Delay",
    description: "Pauses the run for a fixed number of milliseconds before continuing",
    color: "#d97706",
    kind: "action",
    fields: [{ key: "ms", label: "Milliseconds (max 5000)", kind: "text", placeholder: "500" }],
    defaultData: () => ({ ms: "500" }),
    summarize: (data) => {
        const ms = Number(data?.ms);
        return Number.isFinite(ms) && ms > 0 ? `Wait ${ms}ms` : "No delay set";
    },
};

export default delayStep;
