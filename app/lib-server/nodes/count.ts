import { nextEdgeTargets, type NodeExecutor } from "./types";
import ListDocument from "../models/ListDocument";
import { connectDB } from "../mongoose";

const countNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        try {
            await connectDB();

            // Build filter from previous node's data
            let filter: Record<string, any> = {};

            // If previous node has a documents array (from list/find node)
            if (Array.isArray(ctx.body)) {
                // Can't really count an array in a meaningful way with mongo,
                // just count the length
                ctx.body = ctx.body.length;
            } else if (ctx.body && typeof ctx.body === "object") {
                // If it has a documents property, count those
                if (Array.isArray(ctx.body.documents)) {
                    ctx.body = ctx.body.documents.length;
                } else if (ctx.body._id) {
                    // Single document case
                    ctx.body = 1;
                } else {
                    // Try to use body as a filter if it looks like query params
                    // Count matching documents from a list
                    const listId = String(node.data?.list ?? "");
                    if (listId) {
                        // Build match filter from node data if provided
                        const matchQuery = node.data?.match ? JSON.parse(String(node.data.match)) : {};
                        const count = await ListDocument.countDocuments({
                            list: listId,
                            ...matchQuery,
                        });
                        ctx.body = count;
                    } else {
                        ctx.body = 0;
                    }
                }
            } else {
                ctx.body = 0;
            }
        } catch {
            ctx.body = 0;
        }

        return { done: false, nextNodeIds };
    },
};

export default countNode;
