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
        const as = String(node.data?.as ?? "").trim() || "sum";
        const incomingSourceIds = uniqueIncomingSources(edges, node.id);

        let total: number;
        if (incomingSourceIds.length >= 2 && isJoinBody(ctx.body, incomingSourceIds)) {
            // 2+ inputs: Add always waits for every one of them — see
            // lib/node-defs/add.ts's defaultData, where joinMode is fixed
            // to "wait" and never exposed as a toggle, since summing only
            // makes sense once every input has actually arrived. Reads
            // one number per input — the field named for that source in
            // "sumFields" (set per-input in the inspector), or that
            // input's own value if left blank for that source.
            const parts = ctx.body as Record<string, unknown>;
            const sumFields = (node.data?.sumFields ?? {}) as Record<string, string>;
            total = incomingSourceIds.reduce((sum, id) => {
                const fieldName = String(sumFields[id] ?? "").trim();
                const value = fieldName ? readPath(parts[id], fieldName) : parts[id];
                return sum + toNumber(value);
            }, 0);
            // Flatten the join body back into one plain object for
            // whatever's chained after this, same as Mapper/JSON/
            // Condition do — so a downstream node can just use {{field}}
            // instead of needing a source node's id.
            ctx.body = flattenJoinBody(parts);
        } else {
            // 0 or 1 input: read one number — via "Field" if set, else
            // the whole input value — and add the literal "Number" box
            // to it. With no input at all this is just the "Number" box.
            const field = String(node.data?.field ?? "").trim();
            const value = field ? readPath(ctx.body, field) : ctx.body;
            total = toNumber(value) + toNumber(node.data?.number ?? 0);
        }

        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = { ...existing, [as]: total };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default addNode;
