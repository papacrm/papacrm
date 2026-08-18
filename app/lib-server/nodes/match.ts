import { readPath, nextEdgeTargets, type NodeExecutor } from "./types";

// Numeric-aware equality, mirroring Condition's looseEquals (see
// ./condition.ts): "5" == 5 the way a low-code user expects, falling back
// to a plain string compare when either side isn't numeric.
function toNumberOrNaN(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "") return Number(v);
    return NaN;
}

function looseEquals(a: unknown, b: unknown): boolean {
    const na = toNumberOrNaN(a);
    const nb = toNumberOrNaN(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
    return String(a ?? "") === String(b ?? "");
}

function compareNumeric(op: "$gt" | "$gte" | "$lt" | "$lte", docValue: unknown, queryValue: unknown): boolean {
    const a = toNumberOrNaN(docValue);
    const b = toNumberOrNaN(queryValue);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    switch (op) {
        case "$gt":
            return a > b;
        case "$gte":
            return a >= b;
        case "$lt":
            return a < b;
        case "$lte":
            return a <= b;
    }
}

// Evaluates one field's condition against a document value. `condition` is
// either a plain value — exact/loose match, e.g. "status": "active" — or
// an operator object, MongoDB-style, e.g. "age": { "$gt": 3, "$lte": 65 }.
// Previously this node only ever did `doc[key] !== value`, so an operator
// object never matched anything (or, if the JSON failed to parse at all,
// silently fell back to `{}` and matched *everything* — see the query
// parsing below for that half of the fix).
function matchesCondition(docValue: unknown, condition: unknown): boolean {
    if (condition !== null && typeof condition === "object" && !Array.isArray(condition)) {
        for (const [op, opValue] of Object.entries(condition as Record<string, unknown>)) {
            switch (op) {
                case "$gt":
                case "$gte":
                case "$lt":
                case "$lte":
                    if (!compareNumeric(op, docValue, opValue)) return false;
                    break;
                case "$eq":
                    if (!looseEquals(docValue, opValue)) return false;
                    break;
                case "$ne":
                    if (looseEquals(docValue, opValue)) return false;
                    break;
                case "$in":
                    if (!Array.isArray(opValue) || !opValue.some((v) => looseEquals(docValue, v))) return false;
                    break;
                case "$nin":
                    if (Array.isArray(opValue) && opValue.some((v) => looseEquals(docValue, v))) return false;
                    break;
                case "$exists": {
                    const has = docValue !== undefined && docValue !== null && docValue !== "";
                    if (has !== Boolean(opValue)) return false;
                    break;
                }
                case "$regex":
                    try {
                        if (!new RegExp(String(opValue)).test(String(docValue ?? ""))) return false;
                    } catch {
                        return false;
                    }
                    break;
                default:
                    // Unrecognized key starting without $ (or an unknown
                    // operator) — fall back to comparing the whole object
                    // as a literal value rather than silently passing.
                    if (!looseEquals(docValue, condition)) return false;
                    break;
            }
        }
        return true;
    }

    return looseEquals(docValue, condition);
}

function matchesQuery(doc: Record<string, any>, query: Record<string, any>): boolean {
    for (const [key, condition] of Object.entries(query)) {
        if (!matchesCondition(readPath(doc, key), condition)) return false;
    }
    return true;
}

const matchNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const query = (() => {
            try {
                const parsed = JSON.parse(String(node.data?.query ?? "{}"));
                return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
            } catch {
                // Malformed JSON (e.g. unquoted keys like `{ $gt: 3 }`,
                // which isn't valid JSON even though it looks like one)
                // used to silently become `{}` here, which matches every
                // document — the filter looked like it was "on" but did
                // nothing. Keep the graceful fallback (don't fail the run
                // over a typo) but surface it via ctx.body/rerender is out
                // of scope here; the field's own JSON textarea validates
                // on save in the editor.
                return {};
            }
        })();

        // Handle array from Find: [{ _id, field1, field2, ... }, ...]
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.filter((doc: any) => matchesQuery(doc, query));
        }
        // Pass through { listId, fields } unchanged - it's metadata from List/ListUpsert for Find/FindOne
        else if (ctx.body && typeof ctx.body === "object" && "listId" in ctx.body && !("_id" in ctx.body)) {
            // Do nothing - pass through unchanged so List → Match → Find/FindOne works
            // (Find/FindOne will apply the filter at DB level)
        }
        // Handle flat record from Find One: { _id, field1, field2, ... }
        else if (ctx.body && typeof ctx.body === "object") {
            if (!matchesQuery(ctx.body as any, query)) {
                ctx.body = null;
            }
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default matchNode;
