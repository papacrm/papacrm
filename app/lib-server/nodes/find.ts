import { nextEdgeTargets, type NodeExecutor } from "./types";

const findNode: NodeExecutor = {
    run({ node, edges }) {
        // Find is a pass-through node that does nothing on its own.
        // It's a placeholder in the chain — the actual data processing
        // happens in nodes chained after it (Match, Project, Sort, etc.).
        // It just passes ctx.body forward unchanged.
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default findNode;
