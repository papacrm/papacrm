import ListDocument from "../models/ListDocument";
import { sanitizeDocumentData } from "../listValidation";
import { findUniqueFieldConflict } from "../listUnique";
import { nextEdgeTargets, type NodeExecutor } from "./types";
import { resolveListTarget } from "./listResolve";

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

        // No config of its own — the *object to save* is whatever's
        // already on ctx.body when this node runs (the same "current
        // data" every other node reads/writes), and the *target list* is
        // whichever List or List (create if not exists) node is chained
        // right after it. That's the reverse of where the list used to
        // come from: this node used to expect the List/List-upsert node
        // to run first and leave a listId behind on ctx.body, which meant
        // by the time Save to List ran, the object it was supposed to
        // save had already been overwritten by that list node's own
        // fields/documents output. Looking forward instead means the
        // object a person actually wants saved — from an Input Form,
        // Mapper, HTTP Request, etc. — is still intact on ctx.body right
        // here.
        const data = ctx.body ?? {};
        const targetNode = nextNodeIds.map((id) => nodes.find((n) => n.id === id)).find((n) => n && (n.type === "list" || n.type === "listUpsert"));

        // A side effect that also produces its own output — same
        // "skip quietly rather than fail the whole run" spirit as Save to
        // Database: no chained list, a not-yet-configured List node, an
        // empty List (create if not exists) name, or a resolution error
        // all just mean there's nowhere to save, reflected in the output
        // as `_saved: false` instead of failing the run.
        if (!targetNode) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        const resolved = await resolveListTarget(targetNode, ctx).catch(() => null);
        if (!resolved) {
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
