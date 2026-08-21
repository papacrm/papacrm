import { nextEdgeTargets, readPath, type NodeExecutor } from "./types";

// Runtime counterpart of ../../lib/node-defs/passThrough.ts — never
// touches ctx.body itself, just moves on to whatever's wired next.
//
// If "Fields to keep" has anything checked, this also snapshots each of
// those fields' *current* value (read off ctx.body, same as any
// {{template}} would) into ctx.heldFields before moving on, so a node
// later in the chain can still get at them via {{field}} even after
// something in between reassigns `body` wholesale and the original value
// would otherwise be gone. A field with no value at this point simply
// isn't recorded — it doesn't overwrite an earlier Pass Through's
// snapshot of the same key with `undefined`.
const passThroughNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        let keptFields: string[] = [];
        try {
            const parsed = JSON.parse(node.data?.keptFields ?? "[]");
            if (Array.isArray(parsed)) keptFields = parsed;
        } catch {
            keptFields = [];
        }

        for (const key of keptFields) {
            const value = readPath(ctx.body, key);
            if (value !== undefined) ctx.heldFields[key] = value;
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default passThroughNode;
