import { nextEdgeTargets, type NodeExecutor } from "./types";

// Page-building block — a plain spacer. Same passthrough shape as menu.ts
// (see that file for why): its `data.size` is read directly by
// lib/nodes/view.ts when this node is wired into a View.
const gapNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default gapNode;
