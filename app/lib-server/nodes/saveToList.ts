import ListDocument from "../models/ListDocument";
import { sanitizeDocumentData } from "../listValidation";
import { findUniqueFieldConflict } from "../listUnique";
import { nextEdgeTargets, type NodeExecutor } from "./types";
import { resolveListTarget } from "./listResolve";
import { connectDB } from "../mongoose";
import List from "../models/List";

// Shared by every "nothing was actually saved" branch below (no chained
// list, an unresolvable one, or a write error) — same underscore-prefixed
// "_saved" flag a downstream node checks, mirroring Update One's
// "_matched"/"_upserted".
function emptyResult() {
    return { _saved: false };
}

const saveToListNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Expects input from previous node with shape: { listId, fields, documents, ... }
        // The listId and fields come from a List or ListUpsert node chained to the left
        const listId = String((ctx.body as any)?.listId ?? "").trim();
        const fields = (ctx.body as any)?.fields ?? [];

        // Extract the fields to save (everything except listId, documents, fields)
        const data: Record<string, any> = {};
        if (ctx.body && typeof ctx.body === "object") {
            for (const [key, value] of Object.entries(ctx.body)) {
                if (!["listId", "fields", "documents"].includes(key)) {
                    data[key] = value;
                }
            }
        }

        // No list provided or no fields configured
        if (!listId || !fields.length) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        // Resolve the owner from the list
        let owner: any;
        try {
            await connectDB();
            const list = await List.findById(listId).select("owner").lean();
            if (!list) {
                ctx.body = emptyResult();
                return { done: false, nextNodeIds };
            }
            owner = (list as any).owner;
        } catch {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        const resolved = { listId, fields, owner };

        try {
            const sanitized = sanitizeDocumentData(resolved.fields, data);

            // Same "skip quietly" spirit as the rest of this node: a
            // unique-field clash isn't a run failure, it's just nowhere
            // valid to save this particular document, so it comes out the
            // same way "no chained list" does — `_saved: false`.
            const conflict = await findUniqueFieldConflict(resolved.fields, sanitized, resolved.listId, resolved.owner);
            if (conflict) {
                ctx.body = emptyResult();
                return { done: false, nextNodeIds };
            }

            const created = await ListDocument.create({ list: resolved.listId, owner: resolved.owner, data: sanitized });

            // The inserted document, spread the same way Find One hands
            // its match's fields to the next node — so a node right after
            // Save to List can read {{fieldName}} the same way it would
            // any other current data, plus the new document's own id and
            // timestamps for anything that needs to reference the record
            // it just created (e.g. a link back to it, or a follow-up
            // Update One matched on `_id`).
            ctx.body = {
                ...sanitized,
                _id: String(created._id),
                _listId: resolved.listId,
                _saved: true,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
            };
        } catch {
            ctx.body = emptyResult();
        }

        return { done: false, nextNodeIds };
    },
};

export default saveToListNode;
