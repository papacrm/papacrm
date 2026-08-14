import { nextEdgeTargets, type StepExecutor } from "./types";

// Marks the entry point of a workflow that's meant to be invoked by another
// workflow's Call step (see call.ts) rather than by an HTTP request. It
// behaves exactly like Webhook once a run reaches it — just forward to
// whatever's wired up next — but it deliberately has no `matchesTrigger`:
// unlike Webhook, it should never answer a real request to /<path>, so
// findWebhookNode (../workflowEngine.ts) can never select it. The only way
// a run starts here is a Call step naming this workflow explicitly.
const functionStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default functionStep;
