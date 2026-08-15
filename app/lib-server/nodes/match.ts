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

        // Filter documents in ctx.body
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.filter((doc) => {
                for (const [key, value] of Object.entries(query)) {
                    if (doc[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        } else if (ctx.body && typeof ctx.body === "object" && Array.isArray(ctx.body.documents)) {
            ctx.body.documents = ctx.body.documents.filter((doc) => {
                for (const [key, value] of Object.entries(query)) {
                    if (doc.data?.[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default matchNode;
