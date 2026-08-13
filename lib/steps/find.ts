import { nextEdgeTargets, type StepExecutor } from "./types";
import ListDocument from "../models/ListDocument";
import List from "../models/List";
import { connectDB } from "../mongoose";

const findStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.list ?? "");
        if (!listId) {
            ctx.body = { fields: [], documents: [] };
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        try {
            await connectDB();
            // Fetch both list definition (for fields) and documents
            const [list, documents] = await Promise.all([
                List.findById(listId).lean(),
                ListDocument.find({ list: listId }).lean(),
            ]);

            const fields = list ? (list.fields ?? []).map((f: any) => ({ key: f.key, label: f.label, type: f.type })) : [];

            // Store in structured format with fields and documents
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

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default findStep;
