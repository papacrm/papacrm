import { flattenJoinBody, isJoinBody, uniqueIncomingSources, type NodeExecutor } from "./types";

// Ends the run with a raw JSON response instead of a rendered page — for
// building an API endpoint rather than a webpage. No body of its own to
// write: it just responds with whatever's currently on ctx.body, i.e.
// whatever the node(s) chained into it produced (an Input Form submission,
// a Mapper's reshaped object, a List's { fields, documents }, ...).
//
// When this node has 2+ inputs and "Multiple inputs" is set to Wait,
// ctx.body arrives namespaced by source node id (see isJoinBody/
// flattenJoinBody in ./types — same join shape Mapper flattens) — flatten
// that here too, so the response is one combined object of everything
// chained into it rather than requiring a {{sourceNodeId.field}} lookup
// nobody can do on a raw JSON response anyway.
const jsonNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const incomingSourceIds = uniqueIncomingSources(edges, node.id);
        const waitJoin = String((node.data as any)?.joinMode ?? "continue") === "wait" && isJoinBody(ctx.body, incomingSourceIds);
        const data = waitJoin ? flattenJoinBody(ctx.body as Record<string, unknown>) : (ctx.body ?? null);

        const status = Number(node.data?.status);
        return {
            done: true,
            result: { kind: "json", status: Number.isFinite(status) && status > 0 ? status : 200, data },
        };
    },
};

export default jsonNode;
