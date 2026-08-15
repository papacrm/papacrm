import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

// Queues a Set-Cookie onto the eventual HTTP response — it doesn't touch
// the response directly (a node never knows if it's on the branch that
// ends up rendering), it just appends to the shared ctx.setCookies, which
// moduleEngine.ts folds onto whatever result the run finishes with. The
// value is templated from the current context, same {{field}} syntax as
// every other node — i.e. it reads data from *the previous node*, not the
// incoming request (that's what Get Cookie is for).
const setCookieNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "").trim();
        if (name) {
            const value = renderTemplate(String(node.data?.value ?? ""), ctx);
            const maxAgeRaw = node.data?.maxAge;
            const maxAge = maxAgeRaw !== undefined && maxAgeRaw !== "" && !Number.isNaN(Number(maxAgeRaw)) ? Number(maxAgeRaw) : undefined;
            ctx.setCookies = [...ctx.setCookies, { name, value, maxAge, httpOnly: node.data?.httpOnly === "true" }];
        }
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default setCookieNode;
