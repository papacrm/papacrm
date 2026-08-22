import type { IModuleNode } from "../models/Module";
import { nextEdgeTargets, readPath, renderTemplate, type NodeContext, type NodeExecutor } from "./types";

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

function evaluateCondition(node: IModuleNode, body: unknown, query: Record<string, string>, ctx: NodeContext): boolean {
    const { field = "", operator = "equals", value = "" } = node.data ?? {};
    const haystack = readPath(body, field) ?? readPath(query, field);
    // Same {{field}}/{{sourceNodeId.field}} templating every other node's
    // config text gets (see renderTemplate in ./types) — lets "Value" hold
    // something computed earlier in the run (e.g. "{{now}}" from a Now
    // node) instead of only ever a hard-coded literal. A plain literal
    // like "5" or "ok" round-trips through renderTemplate unchanged since
    // it has no {{ }} placeholders to replace.
    const renderedValue = renderTemplate(String(value ?? ""), ctx);

    switch (operator) {
        case "exists":
            return haystack !== undefined && haystack !== null && haystack !== "";
        case "gt": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(renderedValue);
            return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
        }
        case "gte": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(renderedValue);
            return !Number.isNaN(a) && !Number.isNaN(b) && a >= b;
        }
        case "lt": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(renderedValue);
            return !Number.isNaN(a) && !Number.isNaN(b) && a < b;
        }
        case "lte": {
            const a = toNumberOrNaN(haystack);
            const b = toNumberOrNaN(renderedValue);
            return !Number.isNaN(a) && !Number.isNaN(b) && a <= b;
        }
        case "strictEquals":
            return haystack === parseTypedValue(renderedValue);
        case "notEquals":
            return !looseEquals(haystack, renderedValue);
        case "contains":
            return typeof haystack === "string" && haystack.includes(renderedValue);
        case "equals":
        default:
            return looseEquals(haystack, renderedValue);
    }
}

const conditionNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        // If this node has any incoming "data" edges (see ModuleEdge.
        // edgeType in ../../lib/node-defs/types.ts), moduleEngine.ts has
        // already merged their source's last output onto ctx.body before
        // this runs — "Field" can just be e.g. "status", no source node
        // id needed, same as a single-input node.
        const branch = evaluateCondition(node, ctx.body, ctx.query, ctx) ? "true" : "false";

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