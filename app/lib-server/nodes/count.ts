import { nextEdgeTargets, type NodeContext, type NodeExecutor } from "./types";
import ListDocument from "../models/ListDocument";
import List from "../models/List";
import Module from "../models/Module";
import { connectDB } from "../mongoose";

// Count no longer carries its own "list"/"match" fields — those were
// dead configuration (never read by this executor) that duplicated what
// the List and Match nodes already do. Instead Count just reads whatever
// the previous node handed it via ctx.body:
//   - List (chained directly, no Find in between) → { listId, fields }:
//     count every document in that list from the DB.
//   - Find, or Find → Match: ctx.body is already an array → its length.
//   - Find One: ctx.body is a flat { _id, ... } document → 1.
//   - No list, no upstream data → 0.
// The result is folded into ctx.body under `as` (default "count"), same
// "Save as" convention as Now/Random/Add/Env/Get Header/Get Cookie — see
// e.g. ./now.ts — so a later node can read it via {{field}}.
async function resolveCount(ctx: NodeContext): Promise<number> {
    // Array from Find (optionally already filtered by a chained Match).
    if (Array.isArray(ctx.body)) {
        return ctx.body.length;
    }

    // Single document from Find One.
    if (ctx.body && typeof ctx.body === "object" && "_id" in (ctx.body as any)) {
        return 1;
    }

    // List metadata from List, chained straight into Count with no Find
    // in between — count every document in that list.
    if (ctx.body && typeof ctx.body === "object" && "listId" in (ctx.body as any)) {
        const listId = String((ctx.body as any).listId ?? "").trim();
        if (!listId) return 0;

        try {
            await connectDB();

            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) return 0;

            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) return 0;

            return await ListDocument.countDocuments({ list: listId, owner: (list as any).owner });
        } catch {
            return 0;
        }
    }

    // No list selected and nothing upstream (Count used with no input at
    // all, or not exists list).
    return 0;
}

const countNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const as = String(node.data?.as ?? "").trim() || "count";
        const count = await resolveCount(ctx);

        // Same merge as Now/Random/etc — except arrays are deliberately
        // excluded from the spread: Count's own input is very often an
        // array of documents (from Find), and `typeof [] === "object"`
        // would otherwise spread it into numeric keys ({0: doc, 1: doc,
        // ...}) instead of being replaced by the count result.
        const existing = ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body) ? ctx.body : {};
        ctx.body = { ...existing, [as]: count };

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default countNode;
