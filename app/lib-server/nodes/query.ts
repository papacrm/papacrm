import { findOwnedListByName, listDocumentsForList, matchesWhere } from "./listData";
import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

const queryNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // {{field}} templating lets the list name or filter value come from
        // an earlier node (e.g. an Input Form field) instead of always
        // being hard-coded in the node.
        const listName = renderTemplate(String(node.data?.listName ?? ""), ctx).trim();
        const whereField = String(node.data?.whereField ?? "").trim();
        const whereOperator = String(node.data?.whereOperator ?? "equals");
        const whereValue = renderTemplate(String(node.data?.whereValue ?? ""), ctx);

        let fields: any[] = [];
        let documents: { _id: string; data: Record<string, any> }[] = [];

        if (listName) {
            const list = await findOwnedListByName(listName, ctx.moduleId);
            if (list) {
                fields = list.fields ?? [];
                const all = await listDocumentsForList(list);
                documents = whereField ? all.filter((doc) => matchesWhere(doc, whereField, whereOperator, whereValue)) : all;
            }
        }

        // Replaces ctx.body (same "replace" behavior as Mapper's default
        // mode) with a { fields, documents } shape the Table node knows how
        // to render directly — see resolveRows in table.ts.
        ctx.body = { fields, documents };
        return { done: false, nextNodeIds };
    },
};

export default queryNode;
