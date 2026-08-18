import ListDocument from "../models/ListDocument";
import type { IModuleNode } from "../models/Module";
import { sanitizeDocumentData } from "../listValidation";
import { findUniqueFieldConflict } from "../listUnique";
import { nextEdgeTargets, renderTemplateDeep, type NodeExecutor } from "./types";
import { resolveListTarget } from "./listResolve";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function parseJsonObject(raw: unknown): Record<string, unknown> {
    try {
        const parsed = JSON.parse(String(raw ?? "{}"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        // Malformed JSON on the Match/Update node — same "don't fail the
        // run over a typo" spirit as Mapper's own JSON field.
        return {};
    }
}

// "_id" in Match targets the ListDocument's own id; every other key
// targets a field inside its `data`, mirroring how the rest of this node
// family (Find One, Query, Match) reads a document's fields.
function buildFilter(match: Record<string, unknown>, listId: string, owner: unknown): Record<string, unknown> {
    const filter: Record<string, unknown> = { list: listId, owner };
    for (const [key, value] of Object.entries(match)) {
        filter[key === "_id" ? "_id" : `data.${key}`] = value;
    }
    return filter;
}

// Shared by every "nothing matched (and nothing was upserted)" branch
// below — same underscore-prefixed convention Save to List's "_saved"
// uses.
function emptyResult() {
    return { _matched: false, _upserted: false };
}

const updateOneNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Match, Update, and the target List/List (create if not exists)
        // are all read straight off whichever nodes are chained right
        // after this one — same as resolveListTarget below reads a List
        // node's own data without running its full ctx.body-replacing
        // logic. Match and Update nodes work the same way here: their
        // `data.query`/`data.update` are read directly rather than
        // executing them for real, so they can sit in the chain purely
        // to configure this node.
        const nextNodes = nextNodeIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is IModuleNode => Boolean(n));
        const matchNode = nextNodes.find((n) => n.type === "match");
        const updateNode = nextNodes.find((n) => n.type === "update");
        const targetNode = nextNodes.find((n) => n.type === "list" || n.type === "listUpsert");

        // Same {{field}}/{{sourceNodeId.field}} templating as everywhere
        // else, applied recursively so both Match and Update can pull
        // values out of whatever's on ctx.body (an earlier Input Form,
        // Mapper, HTTP Request, ...) — not just hard-coded literals.
        const match = renderTemplateDeep(parseJsonObject(matchNode?.data?.query), ctx) as Record<string, unknown>;
        const update = renderTemplateDeep(parseJsonObject(updateNode?.data?.update), ctx) as Record<string, unknown>;
        const upsert = node.data?.upsert === true;

        if (!targetNode) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        const resolved = await resolveListTarget(targetNode, ctx).catch(() => null);
        if (!resolved) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        // An "_id" that isn't a real ObjectId can never match anything,
        // and would otherwise just throw a cast error below — treat it
        // the same as "no match" rather than failing the run.
        if ("_id" in match && !OBJECT_ID_RE.test(String(match._id ?? ""))) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        const filter = buildFilter(match, resolved.listId, resolved.owner);

        // Only ever writes fields that exist in the target list's own
        // schema, coerced to their field's type — same guard Save to List
        // uses, so Update One can't silently stuff arbitrary keys into a
        // document's `data`.
        const sanitizedUpdate = sanitizeDocumentData(resolved.fields, update);
        const setFields: Record<string, unknown> = { updatedAt: Date.now() };
        for (const [key, value] of Object.entries(sanitizedUpdate)) setFields[`data.${key}`] = value;

        // Only the upsert-a-new-document path can create a fresh unique-
        // field clash — updating a document that already matches `filter`
        // can't conflict with itself. So this only blocks when Match's
        // own filter doesn't already point at an existing document (i.e.
        // findOneAndUpdate is actually about to insert, not update).
        if (upsert) {
            const conflict = await findUniqueFieldConflict(resolved.fields, sanitizedUpdate, resolved.listId, resolved.owner);
            if (conflict) {
                const willUpdateExisting = await ListDocument.exists(filter as any);
                if (!willUpdateExisting) {
                    ctx.body = emptyResult();
                    return { done: false, nextNodeIds };
                }
            }
        }

        try {
            // includeResultMetadata surfaces lastErrorObject.upserted, the
            // only way to tell "matched and updated an existing document"
            // apart from "nothing matched, so a new one was inserted" —
            // both otherwise look identical once `new: true` hands back
            // the resulting document either way. setDefaultsOnInsert
            // (Mongoose's default, named explicitly here since it's load
            // bearing) fills in schema defaults like createdAt on insert;
            // the filter's own equality conditions (list/owner, and any
            // data.<field> from Match) populate the rest of a new
            // document the same way a real findOrCreate would.
            const result = await ListDocument.findOneAndUpdate(filter as any, { $set: setFields } as any, {
                upsert,
                new: true,
                includeResultMetadata: true,
                setDefaultsOnInsert: true,
            } as any);

            const doc = (result as any)?.value as { _id: unknown; data?: Record<string, any>; createdAt?: number; updatedAt?: number } | null;

            if (!doc) {
                ctx.body = emptyResult();
                return { done: false, nextNodeIds };
            }

            ctx.body = {
                ...(doc.data ?? {}),
                _id: String(doc._id),
                _listId: resolved.listId,
                _matched: true,
                _upserted: Boolean((result as any)?.lastErrorObject?.upserted),
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        } catch {
            // A write conflict, an odd cast error Match's shape didn't
            // already rule out, or any other DB error — skip quietly
            // rather than fail the whole run, same spirit as the rest of
            // this node family.
            ctx.body = emptyResult();
        }

        return { done: false, nextNodeIds };
    },
};

export default updateOneNode;
