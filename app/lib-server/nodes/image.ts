import { nextEdgeTargets, type NodeExecutor } from "./types";

// Same shape as Navbar/Footer/Menu — this node has no work of its own to
// do at run time. Its actual rendering happens when a View resolves its
// connected children (see EMBEDDABLE_TYPES and resolveChildren in
// ./view.ts), which reads src/alt straight off node.data.
const imageNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default imageNode;
