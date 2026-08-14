import { nextEdgeTargets, renderTemplate, type StepExecutor } from "./types";

// Queues a response header onto ctx.responseHeaders — folded onto the
// actual HTTP response by workflowEngine.ts once the run finishes, same
// mechanism as Set Cookie. Value is templated from the current context.
const setHeaderStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "").trim();
        if (name) {
            ctx.responseHeaders = { ...ctx.responseHeaders, [name]: renderTemplate(String(node.data?.value ?? ""), ctx) };
        }
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default setHeaderStep;
