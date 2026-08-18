import type { ModuleNodeDef } from "./types";

const saveToListNode: ModuleNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description: "Saves the input object to a list — accepts list metadata from a List/List (create if not exists) node (as input or forward lookup) and data from any input node",
    color: "#0d9488",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Save to list",
    inspectorNote: () => ({
        label: "Tip",
        value: "Connect a List or List (create if not exists) node (either as an input with joinMode wait, or chained after). When using multiple inputs, use joinMode: wait to merge list metadata with your data.",
    }),
};

export default saveToListNode;
