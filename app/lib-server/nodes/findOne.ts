import { findOwnedListByName, findOneDocument } from "./listData";
import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

const findOneNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // {{field}} templating lets the list name or filter value come from
        // an earlier node (e.g. an Input Form field) instead of always
        // being hard-coded in the node — same as Query.
        const listName = renderTemplate(String(node.data?.listName ?? ""), ctx).trim();
        const whereField = String(node.data?.whereField ?? "").trim();
        const whereOperator = String(node.data?.whereOperator ?? "equals");
        const whereValue = renderTemplate(String(node.data?.whereValue ?? ""), ctx);

        let found: { _id: string; data: Record<string, any> } | undefined;

        if (listName) {
            const list = await findOwnedListByName(listName, ctx.moduleId);
            if (list) {
                // A real findOne() — the where filter runs inside Mongo
                // itself via ListDocument.findOne(...).lean(), rather than
                // fetching every document in the list and filtering with
                // Array.find in JS like this node used to. Field selection
                // (which properties come back) is Project's job — chain
                // one after this node to trim the result down.
                found = await findOneDocument(list, whereField, whereOperator, whereValue);
            }
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
