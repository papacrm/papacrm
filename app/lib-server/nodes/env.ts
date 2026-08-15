import { nextEdgeTargets, type NodeExecutor } from "./types";

// Reads a server environment variable (process.env.<name>, e.g. NODE_ENV)
// and folds it into the shared context body under `as`, same pattern as
// Get Header / Get Cookie. Falls back to `fallback` (or "") when the
// variable isn't set — this runs server-side only, so nothing here is
// ever exposed to the browser except whatever the module's own response
// chain (Json/Static Page/etc.) later chooses to include.
const envNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "").trim();
        const as = String(node.data?.as ?? "").trim() || name || "env";
        const fallback = String(node.data?.fallback ?? "");
        if (name) {
            const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
            ctx.body = { ...existing, [as]: process.env[name] ?? fallback };
        }
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default envNode;
