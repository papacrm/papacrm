import type { NodeExecutor } from "./types";

// Ends the run with a raw JSON response instead of a rendered page — for
// building an API endpoint rather than a webpage. No body of its own to
// write: it just responds with whatever's currently on ctx.body, i.e.
// whatever the node(s) chained into it produced (an Input Form submission,
// a Mapper's reshaped object, a List's { fields, documents }, ...). If
// this node has any incoming "data" edges (see ModuleEdge.edgeType in
// ../../lib/node-defs/types.ts), moduleEngine.ts has already merged their
// source's last output onto ctx.body before this runs, so the response is
// one combined object of everything feeding into it.
const jsonNode: NodeExecutor = {
    run({ node, ctx }) {
        const status = Number(node.data?.status);
        return {
            done: true,
            result: { kind: "json", status: Number.isFinite(status) && status > 0 ? status : 200, data: ctx.body ?? null },
        };
    },
};

export default jsonNode;
