import { nextEdgeTargets, type NodeExecutor } from "./types";

// Runtime counterpart of ../../lib/node-defs/passThrough.ts — does
// nothing to ctx.body, just moves on to whatever's wired next.
const passThroughNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default passThroughNode;
