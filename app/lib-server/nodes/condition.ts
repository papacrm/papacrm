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

        // "Pass data through" (the default, and the only behavior before
        // this option existed) forwards whatever's currently on ctx.body —
        // a submitted form's fields, a record an earlier node found, etc.
        // — to the chosen branch's next node unchanged, the same way it
        // would if Condition weren't in the chain at all.
        //
        // Turning it off clears ctx.body to a plain empty object instead.
        // That's for the common case where Condition exists purely to
        // *test* something upstream produced (e.g. checking whether Find
        // One's output is null) — without this, the next node would
        // otherwise inherit whatever unhelpful leftover Find One/Query/
        // etc. put there, even though nothing downstream actually wants
        // that value.
        if (node.data?.passInput === false) {
            ctx.body = {};
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges, branch) };
    },
};

export default conditionNode;