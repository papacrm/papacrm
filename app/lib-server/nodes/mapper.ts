import { nextEdgeTargets, renderTemplate, type NodeContext, type NodeExecutor } from "./types";

// Builds the mapped object from the *current* context (i.e. before it's
// overwritten) — every string value in the mapping is run through the same
// {{field}} templating Static Page and HTTP Request use, so a mapper can
// rename, combine, or hard-code fields from whatever the previous node left
// in ctx.body / ctx.query. Non-string values pass through as-is (handy for
// literal numbers/booleans/nested objects in the mapping JSON).
function applyMapping(mapping: unknown, ctx: NodeContext): Record<string, any> {
    const out: Record<string, any> = {};
    if (!mapping || typeof mapping !== "object") return out;
    for (const [key, value] of Object.entries(mapping as Record<string, unknown>)) {
        out[key] = typeof value === "string" ? renderTemplate(value, ctx) : value;
    }
    return out;
}

// When this node has "Multiple inputs" set to "Wait", moduleEngine's join
// (see settleJoin in ../moduleEngine.ts) hands it a body namespaced by which
// predecessor it arrived from — `{ [sourceNodeId]: bodyFromThatSource }` —
// so a downstream node can target one specifically via
// {{sourceNodeId.field}}. Mapper doesn't use that: it flattens the join
// back into one plain object so the mapping can just use {{field}}
// everywhere, same as a single input. If two inputs share a prop name, the
// one that arrived later simply overwrites the earlier one — Object.values
// walks the join body in the order its keys were inserted, which is arrival
// order (settleJoin builds it by iterating its `arrived` Map, itself
// populated in arrival order) — so this is "last one in wins", not a lookup
// by source node id.
function flattenJoinBody(body: Record<string, unknown>): Record<string, any> {
    const flat: Record<string, any> = {};
    for (const part of Object.values(body)) {
        if (part && typeof part === "object" && !Array.isArray(part)) Object.assign(flat, part);
    }
    return flat;
}

function isJoinBody(ctx: NodeContext, incomingSourceIds: string[]): ctx is NodeContext & { body: Record<string, unknown> } {
    if (incomingSourceIds.length < 2) return false;
    if (!ctx.body || typeof ctx.body !== "object" || Array.isArray(ctx.body)) return false;
    return incomingSourceIds.every((id) => id in (ctx.body as Record<string, unknown>));
}

const mapperNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        let mapping: unknown = {};
        try {
            mapping = JSON.parse(node.data?.mapping ?? "{}");
        } catch {
            // Malformed JSON in the mapping field — pass data through
            // unchanged rather than failing the whole run over a typo.
            mapping = {};
        }

        const incomingSourceIds = Array.from(new Set(edges.filter((e) => e.target === node.id).map((e) => e.source)));
        const waitJoin = String((node.data as any)?.joinMode ?? "continue") === "wait" && isJoinBody(ctx, incomingSourceIds);
        const effectiveCtx: NodeContext = waitJoin ? { ...ctx, body: flattenJoinBody(ctx.body) } : ctx;

        const mapped = applyMapping(mapping, effectiveCtx);
        const existing = effectiveCtx.body && typeof effectiveCtx.body === "object" ? effectiveCtx.body : {};
        ctx.body = node.data?.mode === "merge" ? { ...existing, ...mapped } : mapped;

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default mapperNode;