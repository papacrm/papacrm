import type { WorkflowNodeDef } from "./types";

const saveToListStep: WorkflowNodeDef = {
    type: "saveToList",
    label: "Save to List",
    description: "Stores the current data as a new entry in one of your Lists",
    color: "#0d9488",
    kind: "action",
    fields: [
        {
            key: "listId",
            label: "List",
            kind: "select",
            // Populated with the person's actual Lists by the editor at
            // render time — see WorkflowEditor's `dynamicOptions` handling.
            dynamicOptions: "lists",
            options: [],
        },
    ],
    defaultData: () => ({ listId: "" }),
    summarize: (data) => (data?.listId ? "Saves to a list" : "No list selected"),
    inspectorNote: (data) =>
        data?.listId
            ? null
            : {
                  label: "Tip",
                  value: "Don't see the list you want? Create it under Lists first.",
              },
};

export default saveToListStep;