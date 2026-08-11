import { nextEdgeTargets, type StepExecutor } from "./types";

// Page-building block — see menu.ts for why this is just a passthrough.
// Its `data.tabs` is read directly by lib/steps/view.ts when this node is
// wired into a View.
const tabsStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default tabsStep;
