import { nextEdgeTargets, renderTemplate, type StepExecutor } from "./types";

const linkStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length > 0) {
            ctx.body = nextNodeIds;
        }
        return { done: false, nextNodeIds };
    },
};

export default linkStep;
