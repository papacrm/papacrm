import { nextEdgeTargets, type StepExecutor } from "./types";

// Capped well below typical serverless/edge request timeouts — this is a
// small pacing tool (e.g. spacing out a retry), not a scheduler.
const MAX_DELAY_MS = 5000;

const delayStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const requested = Number(node.data?.ms);
        const ms = Number.isFinite(requested) ? Math.max(0, Math.min(MAX_DELAY_MS, requested)) : 0;

        if (ms > 0) {
            await new Promise((resolve) => setTimeout(resolve, ms));
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default delayStep;
