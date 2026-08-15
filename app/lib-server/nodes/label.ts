import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

const labelNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const text = renderTemplate(String(node.data?.field ?? ""), ctx);
        // If this node is chained to something, pass the rendered text as the body
        // and continue to the next node. Otherwise, act as a passthrough.
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length > 0) {
            ctx.body = text;
        }
        return { done: false, nextNodeIds };
    },
};

export default labelNode;
