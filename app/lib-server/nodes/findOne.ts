import { findOneDocument } from "./listData";
import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";
import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";

const findOneNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Accepts list from input (listId from a List/ListUpsert node chained to the left)
        let list: any = null;
        const listId = String((ctx.body as any)?.listId ?? "").trim();

        if (listId) {
            try {
                await connectDB();
                const module = await Module.findById(ctx.moduleId).select("owner").lean();
                if (!module) {
                    list = null;
                } else {
                    list = await List.findById(listId).lean();
                    // Verify ownership
                    if (list && String((list as any).owner) !== String((module as any).owner)) {
                        list = null;
                    }
                }
            } catch {
                list = null;
            }
        }

        const whereField = String(node.data?.whereField ?? "").trim();
        const whereOperator = String(node.data?.whereOperator ?? "equals");
        const whereValue = renderTemplate(String(node.data?.whereValue ?? ""), ctx);

        let found: { _id: string; data: Record<string, any> } | undefined;

        if (list) {
            found = await findOneDocument(list, whereField, whereOperator, whereValue);
        }

        // Unlike Query — which hands the next node a { fields, documents }
        // shape for Table to render — Find One hands the next node the
        // matching record's own fields directly, so {{field}} reads them
        // the same way it reads a submitted form's fields. `_id` is
        // underscore-prefixed so it doesn't collide with a real field of
        // the same name.
        if (!found) {
            // No match: Merge mode has nothing to merge in, so leave
            // whatever was already on ctx.body untouched. Replace mode (the
            // default) has nothing to replace it with, so ctx.body becomes
            // null — chain a Condition node checking `{{_id}}` exists (or
            // just testing truthiness of the body) to branch on a miss.
            if (node.data?.mode !== "merge") ctx.body = null;
            return { done: false, nextNodeIds };
        }

        const record = { ...found.data, _id: found._id };
        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = node.data?.mode === "merge" ? { ...existing, ...record } : record;

        return { done: false, nextNodeIds };
    },
};

export default findOneNode;
