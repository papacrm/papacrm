import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import type { IModuleNode } from "../models/Module";
import type { IListField } from "../models/List";
import { sanitizeFields } from "../listValidation";
import { renderTemplate, type NodeContext } from "./types";

const MAX_NAME_LENGTH = 120;

export interface ResolvedList {
    listId: string;
    // Same untyped-owner treatment the rest of this node family (list.ts,
    // listUpsert.ts) already uses when passing it straight into a Mongoose
    // query/create call.
    owner: any;
    fields: IListField[];
}

// Resolves the actual list a "list" or "listUpsert" node points at, without
// running that node's own full ctx.body-replacing logic (fetching every
// document, etc.) — used by Save to List (./saveToList.ts) to find out
// *where* to save by looking at the node chained right after it, rather
// than reading a listId left on ctx.body by a node chained before it.
//
// For a List (create if not exists) node this finds-or-creates the list
// right here, with the exact same matching/creation rules as running that
// node for real (see ./listUpsert.ts) — so when the chain actually reaches
// it next, it just finds what was already resolved here instead of racing
// to create a second list with the same name.
//
// Returns null for any node type other than "list"/"listUpsert", or if the
// target can't be resolved (list node not configured, listUpsert name
// template renders empty, module/owner missing, list deleted or not owned
// by this module) — callers should treat that as "nothing to save to" and
// skip quietly, same spirit as the rest of this node family.
export async function resolveListTarget(targetNode: IModuleNode, ctx: NodeContext): Promise<ResolvedList | null> {
    if (targetNode.type !== "list" && targetNode.type !== "listUpsert") return null;

    await connectDB();
    const module = await Module.findById(ctx.moduleId).select("owner").lean();
    if (!module) return null;
    const owner = (module as any).owner;

    if (targetNode.type === "list") {
        const listId = String(targetNode.data?.list ?? "").trim();
        if (!listId) return null;

        const list = await List.findById(listId).lean();
        if (!list || String((list as any).owner) !== String(owner)) return null;

        return { listId: String((list as any)._id), owner, fields: ((list as any).fields ?? []) as IListField[] };
    }

    // listUpsert — same exact-name-match / find-or-create as listUpsertNode.
    const name = renderTemplate(String(targetNode.data?.name ?? ""), ctx).trim().slice(0, MAX_NAME_LENGTH);
    if (!name) return null;

    let listDoc = await List.findOne({ owner, name }).lean();
    if (!listDoc) {
        let schema: unknown = [];
        try {
            schema = JSON.parse(String(targetNode.data?.schema ?? "[]"));
        } catch {
            schema = [];
        }
        const createdDoc = await List.create({ owner, name, fields: sanitizeFields(schema) });
        listDoc = createdDoc.toObject();
    }

    return { listId: String((listDoc as any)._id), owner, fields: ((listDoc as any).fields ?? []) as IListField[] };
}
