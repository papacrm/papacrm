import { nextEdgeTargets, type StepExecutor } from "./types";

// Same shape as Navbar/Footer/Menu — this step has no work of its own to
// do at run time. Its actual rendering happens when a View resolves its
// connected children (see EMBEDDABLE_TYPES and resolveChildren in
// ./view.ts), which reads src/alt straight off node.data.
const imageStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default imageStep;
