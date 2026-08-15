import { nextEdgeTargets, type NodeExecutor } from "./types";

// Marks the entry point of a module that's meant to be invoked by another
// module's Call node (see call.ts) rather than by an HTTP request. It
// behaves exactly like Webhook once a run reaches it — just forward to
// whatever's wired up next — but it deliberately has no `matchesTrigger`:
// unlike Webhook, it should never answer a real request to /<path>, so
// findWebhookNode (../moduleEngine.ts) can never select it. The only way
// a run starts here is a Call node naming this module explicitly.
const functionNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default functionNode;
