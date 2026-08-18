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

            // Handle array from Find
            if (Array.isArray(ctx.body)) {
                ctx.body = ctx.body.length;
            }
            // Handle single document from Find One
            else if (ctx.body && typeof ctx.body === "object" && ctx.body._id) {
                ctx.body = 1;
            }
            // No data
            else {
                ctx.body = 0;
            }
        } catch {
            ctx.body = 0;
        }

        return { done: false, nextNodeIds };
    },
};

export default countNode;
