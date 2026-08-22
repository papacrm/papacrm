import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import { findOneDocument, resolveMatchPushdown } from "./listData";
import { nextEdgeTargets, type NodeExecutor } from "./types";

// See ./find.ts, which this deliberately mirrors — same two input shapes,
// same DB-level Match pushdown, same ownership check. The only real
// difference is calling findOneDocument (a real ListDocument.findOne())
// instead of findDocuments, and returning one flat record instead of an
// array.
const findOneNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Mode 2 (per this node's own inspector tip): chained after Find
        // or Match, so ctx.body is already an array of fetched/filtered
        // documents — [{ _id, field1, field2, ... }, ...]. No DB
        // round-trip needed, just take the first one. This is also the
        // only mode with full operator support for the query that
        // produced it, since Match already ran in-memory over every
        // document — see resolveMatchPushdown's own comment in
        // ./listData.ts for the DB-level shortcut's narrower support.
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.length > 0 ? ctx.body[0] : null;
            return { done: false, nextNodeIds };
        }

        // Mode 1: chained straight from List/List (create if not exists),
        // so ctx.body is still just { listId, fields, ... } list metadata
        // — nothing's been queried yet. Go straight to the DB for a
        // single document via a real findOne().
        const listId = String((ctx.body as any)?.listId ?? "").trim();
        if (!listId) {
            ctx.body = null;
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            // Same smart-filtering shortcut as Find — see
            // resolveMatchPushdown's own comment in ./listData.ts for
            // exactly how (and why) it renders Match's query the same way
            // Match itself would once it actually runs. If Match's query
            // can't be pushed down (an operator condition, or more than
            // one field), this falls back to an unfiltered findOne(),
            // same known limitation Find has for its own DB-level
            // shortcut. The documented, fully-correct way to filter by
            // anything more than one exact field is Mode 2 above: List →
            // Find → Match → Find One.
            const pushdown = resolveMatchPushdown(nextNodeIds, nodes, edges, ctx);
            const doc = await findOneDocument(list, pushdown?.field ?? "", pushdown?.operator ?? "equals", pushdown?.value ?? "");

            // Same flat shape Find hands each array entry — { _id,
            // field1, field2, ... } — so a node right after this one
            // reads {{fieldName}} exactly like it would from any other
            // single-document source (Save to List, Update One, ...).
            ctx.body = doc
                ? { ...doc.data, _id: doc._id, ...(doc.createdAt && { createdAt: doc.createdAt }), ...(doc.updatedAt && { updatedAt: doc.updatedAt }) }
                : null;
        } catch {
            ctx.body = null;
        }

        return { done: false, nextNodeIds };
    },
};

export default findOneNode;
