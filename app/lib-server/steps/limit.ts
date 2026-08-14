import { nextEdgeTargets, type StepExecutor } from "./types";

const limitStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const count = Number(node.data?.count ?? 0);

        if (count <= 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        // Handle both array and { fields, documents } formats
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.slice(0, count);
        } else if (ctx.body && typeof ctx.body === "object" && Array.isArray(ctx.body.documents)) {
            ctx.body.documents = ctx.body.documents.slice(0, count);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default limitStep;
