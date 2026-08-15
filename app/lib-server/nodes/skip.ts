import { nextEdgeTargets, type NodeExecutor } from "./types";

const skipNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const count = Number(node.data?.count ?? 0);

        if (count <= 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        // Handle both array and { fields, documents } formats
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.slice(count);
        } else if (ctx.body && typeof ctx.body === "object" && Array.isArray(ctx.body.documents)) {
            ctx.body.documents = ctx.body.documents.slice(count);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default skipNode;
