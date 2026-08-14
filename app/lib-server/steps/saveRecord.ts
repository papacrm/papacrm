import { connectDB } from "../mongoose";
import WorkflowRecord from "../models/WorkflowRecord";
import { nextEdgeTargets, type StepExecutor } from "./types";

const saveRecordStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        await connectDB();
        await WorkflowRecord.create({ workflow: ctx.workflowId, node: node.id, data: ctx.body ?? {} });
        // A side effect, not a response — keep going to whatever's wired up
        // next (often nothing, if this is a dead-end branch of a fan-out
        // alongside a step that actually renders the page).
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default saveRecordStep;