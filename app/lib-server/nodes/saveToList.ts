import ListDocument from "../models/ListDocument";
import { sanitizeDocumentData } from "../listValidation";
import { nextEdgeTargets, type NodeExecutor } from "./types";
import { resolveListTarget } from "./listResolve";

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

        // A side effect, not a response — same "skip quietly rather than
        // fail the whole run" spirit as Save to Database: no chained
        // list, a not-yet-configured List node, an empty List (create if
        // not exists) name, or a resolution error all just mean there's
        // nowhere to save, not that the run should error out.
        if (targetNode) {
            const resolved = await resolveListTarget(targetNode, ctx).catch(() => null);
            if (resolved) {
                const sanitized = sanitizeDocumentData(resolved.fields, data);
                await ListDocument.create({ list: resolved.listId, owner: resolved.owner, data: sanitized });
            }
        }

        return { done: false, nextNodeIds };
    },
};

export default saveToListNode;
