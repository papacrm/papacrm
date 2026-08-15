import type { ModuleNodeDef } from "./types";

const routeNode: ModuleNodeDef = {
    type: "route",
    label: "Route",
    description: "Runs another module — starting at one of its Webhook nodes — and continues here with its result",
    color: "#7c3aed",
    kind: "action",
    // Like Call, this needs a cascading "which module, then which of its
    // Webhook nodes" picker fed by a server-fetched list — see
    // `listWebhooks` in app/router/modules.ts — so the editor renders a
    // dedicated picker for this node type instead of iterating `fields`.
    fields: [],
    // `webhookPath` is a denormalized copy of the target webhook's path,
    // stored only so the node card can summarize itself without a lookup.
    defaultData: () => ({ moduleId: "", moduleName: "", webhookNodeId: "", webhookPath: "" }),
    summarize: (data) => {
        if (!data?.webhookNodeId) return "No webhook selected";
        const target = data?.webhookPath ? `/${data.webhookPath}` : "webhook";
        return data?.moduleName ? `Routes to ${target} in ${data.moduleName}` : `Routes to ${target}`;
    },
    inspectorNote: (data) =>
        data?.webhookNodeId
            ? {
                  label: "Chaining",
                  value: "If a node follows this one, it receives the routed module's result. Otherwise that result is returned directly.",
              }
            : {
                  label: "Tip",
                  value: "Pick another module's Webhook node to route this run to.",
              },
};

export default routeNode;
