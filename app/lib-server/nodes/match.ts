import { nextEdgeTargets, type NodeExecutor } from "./types";

const matchNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const query = (() => {
            try {
                return JSON.parse(String(node.data?.query ?? "{}"));
            } catch {
                return {};
            }
        })();

        // Handle array from Find: [{ _id, field1, field2, ... }, ...]
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.filter((doc: any) => {
                for (const [key, value] of Object.entries(query)) {
                    if (doc[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }
        // Pass through { listId, fields } unchanged - it's metadata from List/ListUpsert for Find/FindOne
        else if (ctx.body && typeof ctx.body === "object" && "listId" in ctx.body && !("_id" in ctx.body)) {
            // Do nothing - pass through unchanged so List → Match → Find/FindOne works
            // (Find/FindOne will apply the filter at DB level)
        }
        // Handle flat record from Find One: { _id, field1, field2, ... }
        else if (ctx.body && typeof ctx.body === "object") {
            let matches = true;
            for (const [key, value] of Object.entries(query)) {
                if ((ctx.body as any)[key] !== value) {
                    matches = false;
                    break;
                }
            }
            if (!matches) {
                ctx.body = null;
            }
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default matchNode;
