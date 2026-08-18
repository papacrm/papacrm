import type { ModuleNodeDef } from "./types";

const listNode: ModuleNodeDef = {
    type: "list",
    label: "List",
    description: "Provides list metadata (listId and fields) — chain to Find, Find One, or Save to List to work with the list's documents. Can accept input from the left to pass through.",
    color: "#6366f1",
    kind: "action",
    fields: [
        {
            key: "list",
            label: "List",
            kind: "select",
            dynamicOptions: "lists",
        },
    ],
    defaultData: () => ({ list: "" }),
    summarize: (data) => {
        const list = data?.list ?? "";
        return list ? `List metadata` : "No list selected";
    },
    inspectorNote: () => ({
        label: "Tip",
        value: "When used after Save to List, it passes through the saved document without modifying it. When used as a trigger, it provides list metadata to the next node.",
    }),
};

export default listNode;
