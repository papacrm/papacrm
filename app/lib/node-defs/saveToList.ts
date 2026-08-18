import type { ModuleNodeDef } from "./types";

// Accepts list data from input (from a List or List (create if not exists) node on the left).
// Saves the input's data fields as a new document in that list, excluding listId/fields/documents.
const saveToListNode: ModuleNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description: "Saves the data from the input (except listId/fields/documents) as a new entry in the list provided by a List or List (create if not exists) node chained to the left",
    color: "#0d9488",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Saves to list from input",
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain a List or List (create if not exists) node to the left of this one — the list it provides is where your data will be saved.",
    }),
};

export default saveToListNode;
