import { flattenJoinBody, isJoinBody, nextEdgeTargets, readPath, uniqueIncomingSources, type NodeExecutor } from "./types";

function toNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

const addNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const field = String(node.data?.field ?? "").trim();
        const as = String(node.data?.as ?? "").trim() || "sum";

        // Same join shape Mapper/Condition use (see isJoinBody/
        // flattenJoinBody in ./types): with 2+ inputs and "Multiple
        // inputs" set to Wait, ctx.body arrives namespaced by source node
        // id — `{ [sourceNodeId]: bodyFromThatSource }`. Add sums one
        // number *per input* (e.g. two Random nodes in Number mode wired
        // in add up to one total), reading `field` out of each input's
        // body — or, if Field is left blank, using that input's value
        // itself when it's already a plain number.
        const incomingSourceIds = uniqueIncomingSources(edges, node.id);
        const waitJoin = String((node.data as any)?.joinMode ?? "continue") === "wait" && isJoinBody(ctx.body, incomingSourceIds);

        let total: number;
        if (waitJoin) {
            const parts = ctx.body as Record<string, unknown>;
            total = incomingSourceIds.reduce((sum, id) => sum + toNumber(field ? readPath(parts[id], field) : parts[id]), 0);
            // Flatten the join body back into one plain object for
            // whatever's chained after this, same as Mapper/JSON/
            // Condition do — so a downstream node can just use {{field}}
            // instead of needing a source node's id.
            ctx.body = flattenJoinBody(parts);
        } else {
            total = toNumber(field ? readPath(ctx.body, field) : ctx.body);
        }

        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = { ...existing, [as]: total };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default addNode;
