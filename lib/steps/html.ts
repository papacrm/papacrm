import { nextEdgeTargets, renderTemplate, type StepExecutor } from "./types";

// Queues onto ctx.htmlAttrs — folded onto the actual `<html>` element by
// PageExtras.tsx regardless of which step later in the chain ends up
// rendering the response page, same mechanism as Set Header/Set Cookie
// (see lib/steps/setHeader.ts). lang/className are each templated from the
// current context, same {{field}} syntax as everywhere else, so either can
// come from a field an earlier step (e.g. an Input Form submission)
// collected.
//
// Merged shallowly rather than replaced, so a Html step that only sets
// `lang` doesn't clobber a `className` an earlier Html step in the same
// chain already set (and vice versa).
const htmlStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const lang = renderTemplate(String(node.data?.lang ?? ""), ctx).trim();
        const className = renderTemplate(String(node.data?.className ?? ""), ctx).trim();

        ctx.htmlAttrs = {
            ...ctx.htmlAttrs,
            ...(lang ? { lang } : {}),
            ...(className ? { className } : {}),
        };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default htmlStep;
