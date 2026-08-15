import { connectDB } from "../mongoose";
import ModuleRecord from "../models/ModuleRecord";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const saveRecordNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        await connectDB();
        await ModuleRecord.create({ module: ctx.moduleId, node: node.id, data: ctx.body ?? {} });
        // A side effect, not a response — keep going to whatever's wired up
        // next (often nothing, if this is a dead-end branch of a fan-out
        // alongside a node that actually renders the page).
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default saveRecordNode;