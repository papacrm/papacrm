import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import { sanitizeFields } from "../listValidation";
import { nextEdgeTargets, renderTemplate, type NodeExecutor } from "./types";

const MAX_NAME_LENGTH = 120;

// Empty ctx.body shared by every early-exit branch below (not configured,
// module/owner missing, or an unexpected DB error) — same "skip quietly,
// don't fail the run" spirit as Save to List/Save to Database.
function emptyResult() {
    return { listId: "", name: "", created: false, fields: [] };
}

const listUpsertNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Check if this node has input (used after Save to List for forward lookup)
        const hasInput = edges.some((e) => e.target === node.id);

        if (hasInput && ctx.body !== null && ctx.body !== undefined) {
            // Pass through mode: when used after Save to List, don't replace the output
            return { done: false, nextNodeIds };
        }

        // Trigger mode: provide list metadata
        const name = renderTemplate(String(node.data?.name ?? ""), ctx).trim().slice(0, MAX_NAME_LENGTH);

        if (!name) {
            ctx.body = emptyResult();
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = emptyResult();
                return { done: false, nextNodeIds };
            }
            const owner = (module as any).owner;

            // Exact, case-sensitive name match — same matching a person
            // gets picking a list by name anywhere else in the app. Two
            // concurrent runs racing to create the same not-yet-existing
            // name could each end up making one; harmless (each just
            // starts out empty), and no rarer than the same race on any
            // other "find or create" endpoint in the app.
            let listDoc = await List.findOne({ owner, name }).lean();
            let created = false;

            if (!listDoc) {
                let schema: unknown = [];
                try {
                    schema = JSON.parse(String(node.data?.schema ?? "[]"));
                } catch {
                    schema = [];
                }
                const fields = sanitizeFields(schema);
                const createdDoc = await List.create({ owner, name, fields });
                listDoc = createdDoc.toObject();
                created = true;
            }

            const fields = ((listDoc as any).fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type, unique: f.unique ?? undefined }));

            ctx.body = {
                listId: String((listDoc as any)._id),
                name: (listDoc as any).name as string,
                created,
                fields,
            };
        } catch {
            ctx.body = emptyResult();
        }

        return { done: false, nextNodeIds };
    },
};

export default listUpsertNode;
