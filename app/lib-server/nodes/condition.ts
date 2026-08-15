import type { IModuleNode } from "../models/Module";
import { nextEdgeTargets, readPath, type NodeContext, type NodeExecutor } from "./types";

function evaluateCondition(node: IModuleNode, ctx: NodeContext): boolean {
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

const conditionNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const branch = evaluateCondition(node, ctx) ? "true" : "false";
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges, branch) };
    },
};

export default conditionNode;