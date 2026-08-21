import type { ModuleNodeDef } from "./types";

// A relay: whatever's on ctx.body when this node is reached goes to its
// next node completely unchanged — it exists purely so a chain can
// explicitly say "hand this data along" at a point in the graph, e.g. a
// branch of a fan-out that doesn't otherwise touch the data but still
// needs to carry it forward.
//
// "Fields to keep" doesn't filter anything (chain a Project node after
// this one if that's what you want) — it's purely a snapshot. Whatever's
// checked here gets its current value copied into a side channel
// (ctx.heldFields — see lib-server/nodes/types.ts) that survives even if
// a later node reassigns `body` wholesale (Find, List, Project, ...), so
// a node further downstream can still pull it in via {{field}} once it
// actually needs it, instead of it being gone by then.
const passThroughNode: ModuleNodeDef = {
    type: "passThrough",
    label: "Pass data through",
    description:
        "Forwards whatever data is currently on the chain to the next node, unchanged. Optionally snapshots specific fields so a later node can still use them even after something in between replaces the data — chain from a List, List (create if not exists), or Query node (Find/Find One/Match/Sort/Limit/Skip in between are fine too) to see field checkboxes, or type field names directly when there's no List to read them from (e.g. right off a Function's call parameters or a Webhook's body).",
    color: "#64748b",
    kind: "action",
    fields: [
        {
            key: "keptFields",
            label: "Fields to keep",
            kind: "select",
            dynamicOptions: "findFields",
        },
    ],
    defaultData: () => ({ keptFields: "[]" }),
    summarize: (data) => {
        try {
            const fields = JSON.parse(data?.keptFields ?? "[]");
            return Array.isArray(fields) && fields.length > 0
                ? `Forwards data unchanged, keeps ${fields.length} field${fields.length === 1 ? "" : "s"} for later`
                : "Forwards data unchanged";
        } catch {
            return "Forwards data unchanged";
        }
    },
};

export default passThroughNode;
