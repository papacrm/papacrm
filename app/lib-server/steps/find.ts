import { nextEdgeTargets, type StepExecutor } from "./types";

const findStep: StepExecutor = {
    run({ node, edges }) {
        // Find is a pass-through step that does nothing on its own.
        // It's a placeholder in the chain — the actual data processing
        // happens in steps chained after it (Match, Project, Sort, etc.).
        // It just passes ctx.body forward unchanged.
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default findStep;
