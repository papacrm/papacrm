import { nextEdgeTargets, type StepExecutor } from "./types";
import ListDocument from "../models/ListDocument";

const findStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const listId = String(node.data?.list ?? "");
        if (!listId) {
            ctx.body = [];
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        try {
            const documents = await ListDocument.find({ list: listId });
            // Store documents in context body for downstream steps
            ctx.body = documents.map((doc) => ({
                _id: doc._id,
                data: doc.data,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));
        } catch {
            ctx.body = [];
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default findStep;
