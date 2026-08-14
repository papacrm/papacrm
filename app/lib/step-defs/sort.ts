import type { WorkflowNodeDef } from "./types";

const sortStep: WorkflowNodeDef = {
    type: "sort",
    label: "Sort",
    description: "Sort documents — chain from Find or another pipeline step",
    color: "#8b5cf6",
    kind: "action",
    fields: [
        {
            key: "sort",
            label: "Sort (JSON)",
            kind: "textarea",
            placeholder: '{"createdAt": -1}',
        },
    ],
    defaultData: () => ({ sort: "{}" }),
    summarize: (data) => {
        const sort = data?.sort ?? "";
        return sort && sort !== "{}" ? "Sort documents" : "No sort set";
    },
};

export default sortStep;
