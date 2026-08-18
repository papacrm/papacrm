import type { ModuleNodeDef } from "./types";

// No list picker, match, or update of its own — same forward-chaining as
// Save to List (lib/node-defs/saveToList.ts): whichever nodes are chained
// right *after* this one tell it what to do —
//   - a Match node (lib/node-defs/match.ts) supplies which document to find
//   - an Update node (lib/node-defs/update.ts) supplies what to set on it
//   - a List or List (create if not exists) node supplies which list
// With Upsert on, creates a new document from Match + Update when nothing
// matches. See lib-server/nodes/updateOne.ts (and lib-server/nodes/
// listResolve.ts, shared with Save to List) for the actual update logic.
const updateOneNode: ModuleNodeDef = {
    type: "updateOne",
    label: "Update One",
    description:
        "Finds one document in whichever list the next node (a List or List (create if not exists) node) resolves to, using a chained Match node, and applies a chained Update node's fields to it. With Upsert on, creates a new document from Match + Update when nothing matches. Passes the resulting document on as the output.",
    color: "#0d9488",
    kind: "action",
    fields: [
        {
            key: "upsert",
            label: "Insert if no match is found",
            kind: "toggle",
        },
    ],
    defaultData: () => ({ upsert: false }),
    summarize: (data) => (data?.upsert === true ? "Update (upsert)" : "Update"),
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain a Match node, an Update node, and a List or List (create if not exists) node right after this one — that's what tells it which document to find, what to set, and which list to update.",
    }),
};

export default updateOneNode;
