import { nextEdgeTargets, type NodeExecutor } from "./types";
import List from "../models/List";
import Module from "../models/Module";
import { connectDB } from "../mongoose";

const listNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.list ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Check if this node has input (used after Save to List for forward lookup)
        const hasInput = edges.some((e) => e.target === node.id);

        if (hasInput && ctx.body !== null && ctx.body !== undefined) {
            // Pass through mode: when used after Save to List, don't replace the output
            // The saved document is already in ctx.body, just pass it through
            return { done: false, nextNodeIds };
        }

        // Trigger mode: provide list metadata
        if (!listId) {
            ctx.body = { listId: null, fields: [] };
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = { listId: null, fields: [] };
                return { done: false, nextNodeIds };
            }

            // Fetch list and verify ownership
            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) {
                ctx.body = { listId: null, fields: [] };
                return { done: false, nextNodeIds };
            }

            const fields = (list.fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type, unique: f.unique ?? undefined }));

            ctx.body = {
                listId: String(list._id),
                fields,
            };
        } catch {
            ctx.body = { listId: null, fields: [] };
        }

        return { done: false, nextNodeIds };
    },
};

export default listNode;
