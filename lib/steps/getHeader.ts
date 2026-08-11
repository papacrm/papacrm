import { nextEdgeTargets, type StepExecutor } from "./types";

// Reads a header off the incoming webhook request (trigger.headers, always
// lower-cased — see server/hooks/[...path].ts) and folds it into the
// shared context body under `as`. Same pattern as Get Cookie.
const getHeaderStep: StepExecutor = {
    run({ node, ctx, trigger, edges }) {
        const name = String(node.data?.name ?? "").trim().toLowerCase();
        const as = String(node.data?.as ?? "").trim() || name || "header";
        if (name) {
            const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
            ctx.body = { ...existing, [as]: trigger.headers?.[name] };
        }
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default getHeaderStep;
