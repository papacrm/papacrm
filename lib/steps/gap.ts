import { nextEdgeTargets, type StepExecutor } from "./types";

// Page-building block — a plain spacer. Same passthrough shape as menu.ts
// (see that file for why): its `data.size` is read directly by
// lib/steps/view.ts when this node is wired into a View.
const gapStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default gapStep;
