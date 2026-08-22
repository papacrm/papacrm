import { nextEdgeTargets, readPath, uniqueIncomingSources, type NodeExecutor } from "./types";

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
        if (incomingSourceIds.length >= 2) {
            // 2+ inputs: sum one number per predecessor, reading each
            // one's own last output straight off ctx.nodeOutputs (see
            // NodeContext.nodeOutputs in ./types) rather than the current
            // ctx.body — Add needs every source's value kept separate
            // (they may all use the same field name, e.g. "amount"), so
            // it can't rely on the generic data-edge merge every other
            // node uses, which would just overwrite same-named fields
            // instead of summing them. This runs whenever Add itself is
            // triggered, using whichever of its predecessors have
            // produced something by then — a source that hasn't run yet
            // this request simply contributes 0, rather than blocking for
            // it. Reads one number per source — the field named for that
            // source in "sumFields" (set per-input in the inspector), or
            // that source's own last output value directly if left blank.
            const sumFields = (node.data?.sumFields ?? {}) as Record<string, string>;
            total = incomingSourceIds.reduce((sum, id) => {
                const produced = ctx.nodeOutputs[id];
                const fieldName = String(sumFields[id] ?? "").trim();
                const value = fieldName ? readPath(produced, fieldName) : produced;
                return sum + toNumber(value);
            }, 0);
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
