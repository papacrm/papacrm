import { nextEdgeTargets, type NodeExecutor } from "./types";

// Runtime counterpart of ../../lib/node-defs/comment.ts. A Comment note
// has no handles in the editor (kind: "annotation"), so it can never
// actually be wired into a run — this executor only exists so the type
// checks out against NODE_EXECUTORS. If one somehow ends up in a graph
// anyway (e.g. a hand-edited import), it behaves as a harmless
// passthrough rather than breaking the run.
const commentNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default commentNode;
