import type { ModuleNodeDef } from "./types";

// No body of its own to write — it responds with whatever's chained into
// it (ctx.body), the same "current data" every other node reads/writes.
// See lib-server/nodes/json.ts for exactly what that ends up being,
// including how any "data" edges into it (see ModuleEdge.edgeType in
// ./types.ts) get merged in first.
const jsonNode: ModuleNodeDef = {
    type: "json",
    label: "JSON",
    description: "Responds with whatever's chained into it — an object or an array — as raw JSON instead of a page",
    color: "#b45309",
    kind: "terminal",
    fields: [{ key: "status", label: "Status code (optional)", kind: "text", placeholder: "200" }],
    defaultData: () => ({ status: "200" }),
    summarize: () => "Responds with the incoming data as JSON",
};

export default jsonNode;
