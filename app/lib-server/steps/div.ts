import { nextEdgeTargets, type StepExecutor } from "./types";

// Page-building block — a plain container. Same passthrough shape as
// gap.ts (see that file for why): its `data.layout` (which other blocks
// sit inside it, and where) is read directly by ./view.ts when this node
// is wired into a View or another Div, not by running this executor.
const divStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default divStep;
