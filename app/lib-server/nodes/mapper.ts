import { nextEdgeTargets, renderTemplate, type NodeContext, type NodeExecutor } from "./types";

// Builds the mapped object from the *current* context (i.e. before it's
// overwritten) — every string value in the mapping is run through the same
// {{field}} templating Static Page and HTTP Request use, so a mapper can
// rename, combine, or hard-code fields from whatever's on ctx.body / ctx.
// query. Non-string values pass through as-is (handy for literal numbers/
// booleans/nested objects in the mapping JSON). If this node has any
// incoming "data" edges (see ModuleEdge.edgeType in
// ../../lib/node-defs/types.ts), moduleEngine.ts has already merged their
// source's last output onto ctx.body before this runs, so {{field}} just
// works the same whether a value came from the node that triggered this
// one or from a data edge feeding it in parallel.
function applyMapping(mapping: unknown, ctx: NodeContext): Record<string, any> {
    const out: Record<string, any> = {};
    if (!mapping || typeof mapping !== "object") return out;
    for (const [key, value] of Object.entries(mapping as Record<string, unknown>)) {
        out[key] = typeof value === "string" ? renderTemplate(value, ctx) : value;
    }
    return out;
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

        const mapped = applyMapping(mapping, ctx);
        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = node.data?.mode === "merge" ? { ...existing, ...mapped } : mapped;

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default mapperNode;
