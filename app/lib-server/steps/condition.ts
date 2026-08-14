import type { IWorkflowNode } from "../models/Workflow";
import { nextEdgeTargets, readPath, type StepContext, type StepExecutor } from "./types";

function evaluateCondition(node: IWorkflowNode, ctx: StepContext): boolean {
    const { field = "", operator = "equals", value = "" } = node.data ?? {};
    const haystack = readPath(ctx.body, field) ?? readPath(ctx.query, field);

    switch (operator) {
        case "exists":
            return haystack !== undefined && haystack !== null && haystack !== "";
        case "notEquals":
            return String(haystack ?? "") !== String(value);
        case "contains":
            return typeof haystack === "string" && haystack.includes(String(value));
        case "equals":
        default:
            return String(haystack ?? "") === String(value);
    }
}

const conditionStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const branch = evaluateCondition(node, ctx) ? "true" : "false";
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges, branch) };
    },
};

export default conditionStep;