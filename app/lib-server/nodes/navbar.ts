import { nextEdgeTargets, type NodeExecutor } from "./types";

// Page-building block — see menu.ts for why this is just a passthrough.
// Its `data.brand` / `data.links` are read directly by lib/nodes/view.ts
// when this node is wired into a View.
const navbarNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default navbarNode;
