import { nextEdgeTargets, type NodeExecutor } from "./types";

const limitNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const count = Number(node.data?.count ?? 0);

        if (count <= 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        // Handle array format from Find
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.slice(0, count);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default limitNode;
