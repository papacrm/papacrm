import type { ModuleNodeDef } from "./types";

const saveToListNode: ModuleNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description: "Saves the input object to a list — accepts list metadata from a List/List (create if not exists) node and data from any input node",
    color: "#0d9488",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Save to list",
    inspectorNote: () => ({
        label: "Tip",
        value:
            "Connect a List or List (create if not exists) node with a data edge (click the icon on the connection to switch it) so its listId/fields land alongside whatever your data node sends in via a normal workflow edge — or just chain a List/List (create if not exists) node right after this one instead.",
    }),
};

export default saveToListNode;
