import { nextEdgeTargets, type StepExecutor } from "./types";

// Page-building block — see menu.ts for why this is just a passthrough.
// Its `data.text` / `data.links` are read directly by lib/steps/view.ts
// when this node is wired into a View.
const footerStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default footerStep;
