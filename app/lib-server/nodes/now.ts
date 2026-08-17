import { nextEdgeTargets, type NodeExecutor } from "./types";

// Returns the current time as a number — Unix epoch milliseconds, the same
// unit Date.now()/new Date(ms) use everywhere else in JS — rather than a
// formatted string, so it can be used directly downstream (e.g. chained
// into Add, or compared numerically in a Condition) without any parsing.
const nowNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const as = String(node.data?.as ?? "").trim() || "now";
        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = { ...existing, [as]: Date.now() };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default nowNode;
