import type { WorkflowNodeDef } from "./types";

const routeStep: WorkflowNodeDef = {
    type: "route",
    label: "Route",
    description: "Runs another workflow — starting at one of its Webhook steps — and continues here with its result",
    color: "#7c3aed",
    kind: "action",
    // Like Call, this needs a cascading "which workflow, then which of its
    // Webhook steps" picker fed by a server-fetched list — see
    // `listWebhooks` in app/router/workflows.ts — so the editor renders a
    // dedicated picker for this node type instead of iterating `fields`.
    fields: [],
    // `webhookPath` is a denormalized copy of the target webhook's path,
    // stored only so the node card can summarize itself without a lookup.
    defaultData: () => ({ workflowId: "", workflowName: "", webhookNodeId: "", webhookPath: "" }),
    summarize: (data) => {
        if (!data?.webhookNodeId) return "No webhook selected";
        const target = data?.webhookPath ? `/${data.webhookPath}` : "webhook";
        return data?.workflowName ? `Routes to ${target} in ${data.workflowName}` : `Routes to ${target}`;
    },
    inspectorNote: (data) =>
        data?.webhookNodeId
            ? {
                  label: "Chaining",
                  value: "If a step follows this one, it receives the routed workflow's result. Otherwise that result is returned directly.",
              }
            : {
                  label: "Tip",
                  value: "Pick another workflow's Webhook step to route this run to.",
              },
};

export default routeStep;
