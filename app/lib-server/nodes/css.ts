import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

// Queues a raw <style> block onto ctx.clientStyles — folded into the
// page's <head> by PageExtras.tsx the same way Set Header queues onto
// ctx.responseHeaders (see lib/nodes/setHeader.ts), so it works no matter
// which node later in the chain actually renders the response page. The
// CSS text itself is templated the same {{field}} way as everywhere else
// (e.g. to bake in a color an earlier node computed).
const cssNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const css = renderTemplate(String(node.data?.css ?? ""), ctx);
        if (css.trim()) {
            ctx.clientStyles = [...ctx.clientStyles, css];
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default cssNode;
