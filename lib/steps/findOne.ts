import { findOwnedListByName, listDocumentsForList, matchesWhere } from "./listData";
import { nextEdgeTargets, renderTemplate, type StepExecutor } from "./types";

const findOneStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // {{field}} templating lets the list name or filter value come from
        // an earlier step (e.g. an Input Form field) instead of always
        // being hard-coded in the node — same as Query.
        const listName = renderTemplate(String(node.data?.listName ?? ""), ctx).trim();
        const whereField = String(node.data?.whereField ?? "").trim();
        const whereOperator = String(node.data?.whereOperator ?? "equals");
        const whereValue = renderTemplate(String(node.data?.whereValue ?? ""), ctx);

        let found: { _id: string; data: Record<string, any> } | undefined;

        if (listName) {
            const list = await findOwnedListByName(listName, ctx.workflowId);
            if (list) {
                const all = await listDocumentsForList(list);
                // No where field set: just take the first (most recent —
                // listDocumentsForList sorts newest first) record in the
                // list, same "no filter" behavior Query has for "all of".
                found = whereField ? all.find((doc) => matchesWhere(doc, whereField, whereOperator, whereValue)) : all[0];
            }
        }

        // Unlike Query — which hands the next step a { fields, documents }
        // shape for Table to render — Find One hands the next step the
        // matching record's own fields directly, so {{field}} reads them
        // the same way it reads a submitted form's fields. `_id`/`_found`
        // are underscore-prefixed so they don't collide with a real field
        // of the same name.
        const record = { ...(found?.data ?? {}), _id: found?._id ?? null, _found: Boolean(found) };
        const existing = ctx.body && typeof ctx.body === "object" ? ctx.body : {};
        ctx.body = node.data?.mode === "merge" ? { ...existing, ...record } : record;

        return { done: false, nextNodeIds };
    },
};

export default findOneStep;
