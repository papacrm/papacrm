import { nextEdgeTargets, type NodeExecutor } from "./types";

const textInputNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If this input has a name, pass its value to the next node. A
        // State node chained directly into this one (state -> input) wins
        // — that's the explicit "state gives me my value" hand-off — else
        // keep whatever's already there (a webhook payload, a submitted
        // form field, ...), defaulting to empty.
        if (name && ctx.body && typeof ctx.body === "object") {
            const stateData = ctx.stateValues?.data;
            const fromState = stateData && Object.prototype.hasOwnProperty.call(stateData, name) ? stateData[name] : undefined;
            ctx.body[name] = fromState ?? ctx.body[name] ?? "";
        }

        return { done: false, nextNodeIds };
    },
};

export default textInputNode;
