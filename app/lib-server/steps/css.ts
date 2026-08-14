import { nextEdgeTargets, renderTemplate, type StepExecutor } from "./types";

// Queues a raw <style> block onto ctx.clientStyles — folded into the
// page's <head> by PageExtras.tsx the same way Set Header queues onto
// ctx.responseHeaders (see lib/steps/setHeader.ts), so it works no matter
// which step later in the chain actually renders the response page. The
// CSS text itself is templated the same {{field}} way as everywhere else
// (e.g. to bake in a color an earlier step computed).
const cssStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const css = renderTemplate(String(node.data?.css ?? ""), ctx);
        if (css.trim()) {
            ctx.clientStyles = [...ctx.clientStyles, css];
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default cssStep;
