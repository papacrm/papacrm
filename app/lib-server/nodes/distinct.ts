import { nextEdgeTargets, type NodeExecutor } from "./types";

// Reads one field off each document in ctx.body — either a plain array of
// documents ({ _id, data }) or the { fields, documents } shape Query/List
// hand off — and replaces ctx.body with the unique, non-empty values in
// first-seen order. Same "accept both shapes" pattern as Match/Project.
const distinctNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const field = String(node.data?.field ?? "").trim();
        const nextNodeIds = nextEdgeTargets(node, edges);

        if (!field) {
            return { done: false, nextNodeIds };
        }

        const documents: any[] = Array.isArray(ctx.body)
            ? ctx.body
            : ctx.body && typeof ctx.body === "object" && Array.isArray((ctx.body as any).documents)
              ? (ctx.body as any).documents
              : [];

        const seen = new Set<string>();
        const values: unknown[] = [];
        for (const doc of documents) {
            const value = doc && typeof doc === "object" && "data" in doc ? doc.data?.[field] : doc?.[field];
            if (value === undefined || value === null || value === "") continue;
            const key = String(value);
            if (seen.has(key)) continue;
            seen.add(key);
            values.push(value);
        }

        ctx.body = values;
        return { done: false, nextNodeIds };
    },
};

export default distinctNode;
