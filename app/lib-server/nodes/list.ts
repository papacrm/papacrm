import { nextEdgeTargets, type NodeExecutor } from "./types";
import List from "../models/List";
import Module from "../models/Module";
import { connectDB } from "../mongoose";

const listNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.list ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Pass-through mode is only for the "Save to List → List/List
        // Upsert (forward lookup)" pattern (see saveToList.ts) — Save to
        // List's own output always carries a `_saved` key (true or
        // false), which is what actually identifies that pattern here.
        // The previous check — any incoming edge at all, plus a non-null
        // ctx.body — falsely matched *any* node placed right after this
        // one with unrelated data already on it (e.g. Input Form → List
        // Upsert), which meant this node's own list lookup/creation was
        // silently skipped and ctx.body was left as whatever the
        // unrelated predecessor had produced, with no listId anywhere on
        // it — see lib-server/nodes/find.ts / findOne.ts, which then had
        // nothing to query with.
        const isSaveToListOutput = ctx.body !== null && typeof ctx.body === "object" && !Array.isArray(ctx.body) && "_saved" in ctx.body;

        if (isSaveToListOutput) {
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
