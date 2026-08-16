import type { ModuleNodeDef } from "./types";

// No config of its own — it saves whatever the *current data* already is
// (whatever an earlier node like Input Form, Mapper, or HTTP Request left
// on it) into whichever list a List (lib/node-defs/list.ts) or List
// (create if not exists) (lib/node-defs/listUpsert.ts) node chained right
// *after* this one resolves to. See lib-server/nodes/saveToList.ts (and
// lib-server/nodes/listResolve.ts, which it shares with List (create if
// not exists)) for the save logic.
const saveToListNode: ModuleNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description:
        "Stores the current data as a new entry in whichever list the next node (a List or List (create if not exists) node) resolves to, and passes the saved document (with its _id) on as the output",
    color: "#0d9488",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Saves to the next list",
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain this right before a List or List (create if not exists) node — that's what tells it which list to save into.",
    }),
};

export default saveToListNode;
