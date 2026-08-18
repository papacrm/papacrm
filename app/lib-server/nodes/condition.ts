import type { IModuleNode } from "../models/Module";
import { flattenJoinBody, isJoinBody, nextEdgeTargets, readPath, uniqueIncomingSources, type NodeExecutor } from "./types";

function toNumberOrNaN(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return NaN;
}

// == / != are numeric-aware: "5" == 5 the way a low-code user expects,
// falling back to a plain string compare when either side isn't numeric.
function looseEquals(haystack: unknown, value: unknown): boolean {
    const a = toNumberOrNaN(haystack);
    const b = toNumberOrNaN(value);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a === b;
    return String(haystack ?? "") === String(value ?? "");
}

// === has no real notion of "type" for the Value box (it's always just
// text), so it infers one: "true"/"false" becomes a boolean, a numeric
// string becomes a number, anything else stays a string — then compares
// with real strict equality against whatever type `haystack` actually is.
// Unlike ==, a string "5" is NOT === the number 5.
function parseTypedValue(raw: string): unknown {
    if (raw === "true") return true;
    if (raw === "false") return false;
    if (raw.trim() !== "" && !Number.isNaN(Number(raw))) return Number(raw);
    return raw;
}

function evaluateCondition(node: IModuleNode, body: unknown, query: Record<string, string>): boolean {
    const { field = "", operator = "equals", value = "" } = node.data ?? {};
    const haystack = readPath(body, field) ?? readPath(query, field);

    switch (operator) {
        case "exists":
            return haystack !== undefined && haystack !== null && haystack !== "";
        case "gt": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(value);
            return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
        }
        case "gte": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(value);
            return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
        }
        case "lt": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(value);
            return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
        }
        case "lte": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(value);
            return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
        }
        case "strictEquals":
            return haystack === parseTypedValue(String(value ?? ""));
        case "notEquals":
            return !looseEquals(haystack, value);
        case "contains":
            return typeof haystack === "string" && haystack.includes(String(value));
        case "equals":
        default:
            return looseEquals(haystack, value);
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

        // Whatever's currently on ctx.body — a submitted form's fields, a
        // record an earlier node found, etc. — always forwards to the
        // chosen branch's next node unchanged, the same way it would if
        // Condition weren't in the chain at all. Use a "Pass data
        // through" node (./passThrough.ts) elsewhere in the graph if you
        // need to relay data from one point to another unchanged.
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges, branch) };
    },
};

export default conditionNode;