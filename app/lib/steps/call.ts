import type { WorkflowNodeDef } from "./types";

const callStep: WorkflowNodeDef = {
    type: "call",
    label: "Call",
    description: "Runs another workflow (starting at its Function step) and continues here with its result",
    color: "#0f766e",
    kind: "action",
    fields: [
        {
            key: "workflowId",
            label: "Workflow",
            kind: "select",
            // Populated with the person's own workflows by the editor at
            // render time — see WorkflowEditor's dynamicOptions handling.
            dynamicOptions: "workflows",
            options: [],
        },
    ],
    defaultData: () => ({ workflowId: "" }),
    summarize: (data) => (data?.workflowId ? "Calls another workflow" : "No workflow selected"),
    inspectorNote: (data) =>
        data?.workflowId
            ? {
                  label: "Chaining",
                  value: "If a step follows this one, it receives the called workflow's result. Otherwise that result is returned directly.",
              }
            : {
                  label: "Tip",
                  value: "The workflow you call needs a Function step as its starting point.",
              },
};

export default callStep;
