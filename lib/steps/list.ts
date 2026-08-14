import { nextEdgeTargets, type StepExecutor } from "./types";
import List from "../models/List";
import ListDocument from "../models/ListDocument";
import Workflow from "../models/Workflow";
import { connectDB } from "../mongoose";

const listStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.list ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        if (!listId) {
            ctx.body = { fields: [], documents: [] };
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const workflow = await Workflow.findById(ctx.workflowId).select("owner").lean();
            if (!workflow) {
                ctx.body = { fields: [], documents: [] };
                return { done: false, nextNodeIds };
            }

            // Fetch list and verify ownership
            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((workflow as any).owner)) {
                ctx.body = { fields: [], documents: [] };
                return { done: false, nextNodeIds };
            }

            const fields = (list.fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type }));

            // Fetch documents for the selected list
            const documents = await ListDocument.find({ list: listId, owner: (list as any).owner }).lean();

            ctx.body = {
                fields,
                documents: documents.map((doc: any) => ({
                    _id: String(doc._id),
                    data: doc.data ?? {},
                    createdAt: doc.createdAt,
                    updatedAt: doc.updatedAt,
                })),
            };
        } catch {
            ctx.body = { fields: [], documents: [] };
        }

        return { done: false, nextNodeIds };
    },
};

export default listStep;
