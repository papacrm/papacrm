import { nextEdgeTargets, type StepExecutor } from "./types";

const limitStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const count = Number(node.data?.count ?? 0);

        if (Array.isArray(ctx.body) && count > 0) {
            ctx.body = ctx.body.slice(0, count);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default limitStep;
