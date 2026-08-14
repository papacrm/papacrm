import { connectDB } from "../mongoose";
import List from "../models/List";
import ListDocument from "../models/ListDocument";
import Workflow from "../models/Workflow";
import { sanitizeDocumentData } from "../listValidation";
import { nextEdgeTargets, type StepExecutor } from "./types";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

const saveToListStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.listId ?? "").trim();

        // A side effect, not a response — same shape as Save to Database:
        // skip quietly (rather than failing the whole run) if the node
        // isn't configured yet, points at a deleted list, or — since a
        // hand-edited node could reference any id — a list that doesn't
        // belong to the workflow's own owner.
        if (OBJECT_ID_RE.test(listId)) {
            await connectDB();
            const [list, workflow] = await Promise.all([List.findById(listId).lean(), Workflow.findById(ctx.workflowId).select("owner").lean()]);

            if (list && workflow && String((list as any).owner) === String((workflow as any).owner)) {
                const data = sanitizeDocumentData((list as any).fields ?? [], ctx.body ?? {});
                await ListDocument.create({ list: listId, owner: (list as any).owner, data });
            }
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default saveToListStep;