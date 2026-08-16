import type { ModuleNodeDef } from "./types";

// No config of its own — chain a List (lib/node-defs/list.ts) or List
// (create if not exists) (lib/node-defs/listUpsert.ts) node in right
// before this one and it saves into whichever list that node resolved
// (it reads `listId` off the current data, same as any other node reads
// a field). See lib-server/nodes/saveToList.ts for the save logic.
const saveToListNode: ModuleNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description: "Stores the current data as a new entry in the list resolved by the previous node (a List or List (create if not exists) node)",
    color: "#0d9488",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Saves to the incoming list",
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain this after a List or List (create if not exists) node — that's what tells it which list to save into.",
    }),
};

export default saveToListNode;
