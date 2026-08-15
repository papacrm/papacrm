import { nextEdgeTargets, type NodeExecutor } from "./types";

// Reads a cookie off the *incoming* webhook request (trigger.cookies — see
// server/hooks/[...path].ts, which parses the Cookie header once per
// request) and folds it into the shared context body under `as`, so any
// node further down the chain can read it the normal {{field}} way. This
// is the request-side counterpart to Set Cookie, which writes to the
// *outgoing* response instead.
const getCookieNode: NodeExecutor = {
    run({ node, ctx, trigger, edges }) {
        const name = String(node.data?.name ?? "").trim();
        const as = String(node.data?.as ?? "").trim() || name || "cookie";
        if (name) {
            const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
            ctx.body = { ...existing, [as]: trigger.cookies?.[name] };
        }
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default getCookieNode;
