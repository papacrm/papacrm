import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

const linkNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length > 0) {
            ctx.body = nextNodeIds;
        }
        return { done: false, nextNodeIds };
    },
};

export default linkNode;
