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