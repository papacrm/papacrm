import type { IModuleNode } from "../models/Module";
import { flattenJoinBody, isJoinBody, nextEdgeTargets, readPath, uniqueIncomingSources, type NodeExecutor } from "./types";

function evaluateCondition(node: IModuleNode, body: unknown, query: Record<string, string>): boolean {
    const { field = "", operator = "equals", value = "" } = node.data ?? {};
    const haystack = readPath(body, field) ?? readPath(query, field);

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
        // Same join-flattening Mapper uses (see flattenJoinBody's doc
        // comment in ./types): when this node has 2+ inputs and "Multiple
        // inputs" is set to Wait, ctx.body arrives namespaced by source
        // node id. Flatten it — and, importantly, write the flattened
        // version *back* onto ctx.body — so "Field" can just be e.g.
        // "status" (no source node id needed), and so anything downstream
        // (e.g. "Pass data through" handing this on to JSON/Mapper/etc.)
        // sees the same flattened object rather than the raw namespaced
        // one, which would otherwise still show up keyed by an
        // unflattened node id like "n_xxxxx" in the final result.
        const incomingSourceIds = uniqueIncomingSources(edges, node.id);
        const waitJoin = String((node.data as any)?.joinMode ?? "continue") === "wait" && isJoinBody(ctx.body, incomingSourceIds);
        if (waitJoin) {
            ctx.body = flattenJoinBody(ctx.body as Record<string, unknown>);
        }

        const branch = evaluateCondition(node, ctx.body, ctx.query) ? "true" : "false";

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