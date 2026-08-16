import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import { findDocuments } from "./listData";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const findNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        const listId = String(node.data?.list ?? "");

        if (!listId) {
            ctx.body = { fields: [], documents: [] };
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = { fields: [], documents: [] };
                return { done: false, nextNodeIds };
            }

            // Fetch list and verify ownership — same check List and Save
            // to List use.
            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) {
                ctx.body = { fields: [], documents: [] };
                return { done: false, nextNodeIds };
            }

            const fields = (list.fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type, unique: f.unique ?? undefined }));

            // A real find() — no where filter here (that's what a chained
            // Match node is for) and no projection here either — field
            // selection is Project's job, chain one after this node (or
            // after Match/Sort/Limit/Skip) to trim the result down.
            const documents = await findDocuments(list, "", "equals", "");

            ctx.body = { fields, documents };
        } catch {
            ctx.body = { fields: [], documents: [] };
        }

        return { done: false, nextNodeIds };
    },
};

export default findNode;
