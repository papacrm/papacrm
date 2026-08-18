import ListDocument from "../models/ListDocument";
import { sanitizeDocumentData } from "../listValidation";
import { findUniqueFieldConflict } from "../listUnique";
import { nextEdgeTargets, type NodeExecutor } from "./types";
import { resolveListTarget } from "./listResolve";
import type { IModuleNode } from "../models/Module";

// Shared by every "nothing was actually saved" branch below (no chained
// list, an unresolvable one, or a write error) — same underscore-prefixed
// "_saved" flag a downstream node checks, mirroring Update One's
// "_matched"/"_upserted".
function emptyResult() {
    return { _saved: false };
}

const saveToListNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        let resolved = null;
        let data: Record<string, any> = {};

        // Check if ctx.body is namespaced (joinMode: "wait" with multiple inputs)
        const isNamespaced = ctx.body && typeof ctx.body === "object" &&
            Object.values(ctx.body).some((v: any) => v && typeof v === "object" && "__node" in v);

        if (isNamespaced) {
            // Extract from namespaced inputs
            let listNamespace: any = null;

            for (const [key, value] of Object.entries(ctx.body as any)) {
                if (value && typeof value === "object") {
                    // Check if this namespace has list metadata
                    if (value.listId && value.fields) {
                        listNamespace = value;
                    } else {
                        // Merge non-list data
                        for (const [dataKey, dataValue] of Object.entries(value)) {
                            if (dataKey !== "__node") {
                                data[dataKey] = dataValue;
                            }
                        }
                    }
                }
            }

            if (listNamespace && listNamespace.listId && listNamespace.fields) {
                const listId = String(listNamespace.listId);
                const fields = listNamespace.fields;

                // Get owner from the list
                try {
                    const { connectDB } = await import("../mongoose");
                    const List = (await import("../models/List")).default;
                    await connectDB();
                    const list = await List.findById(listId).select("owner").lean();
                    if (list) {
                        resolved = { listId, fields, owner: (list as any).owner };
                    }
                } catch {
                    // Error getting list
                }
            }
        } else {
            // Non-namespaced - check if list metadata is in the input directly
            const listId = String((ctx.body as any)?.listId ?? "").trim();
            const fields = (ctx.body as any)?.fields ?? [];

            if (listId && fields.length > 0) {
            // List metadata is in the input - extract it and get the data fields
            resolved = { listId, fields, owner: null as any };

            // Get owner from the list
            try {
                const { connectDB } = await import("../mongoose");
                const List = (await import("../models/List")).default;
                await connectDB();
                const list = await List.findById(listId).select("owner").lean();
                if (list) {
                    resolved.owner = (list as any).owner;

                    // Extract data to save: everything except list metadata
                    if (ctx.body && typeof ctx.body === "object") {
                        for (const [key, value] of Object.entries(ctx.body)) {
                            if (
                                !["listId", "fields", "documents", "name", "created"].includes(key) &&
                                !key.startsWith("_") &&
                                !["createdAt", "updatedAt"].includes(key)
                            ) {
                                data[key] = value;
                            }
                        }
                    }
                } else {
                    resolved = null;
                }
            } catch {
                resolved = null;
            }
            } else {
                // No list metadata in input - try forward lookup
                const nextNodes = nextNodeIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is IModuleNode => Boolean(n));
                const targetNode = nextNodes.find((n) => n.type === "list" || n.type === "listUpsert");

                if (targetNode) {
                    resolved = await resolveListTarget(targetNode, ctx).catch(() => null);
                    if (resolved && ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)) {
                        Object.assign(data, ctx.body);
                    }
                }
            }
        }

        if (!resolved) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        // If no data to save after filtering, skip quietly
        if (Object.keys(data).length === 0) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

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
