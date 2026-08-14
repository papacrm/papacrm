import type { WorkflowNodeDef } from "./types";

const projectStep: WorkflowNodeDef = {
    type: "project",
    label: "Project",
    description: "Select fields — chain from Find or another pipeline step",
    color: "#8b5cf6",
    kind: "terminal",
    fields: [
        {
            key: "selectedFields",
            label: "Fields",
            kind: "select",
            // This marker tells the editor to use dynamic field checkboxes
            dynamicOptions: "findFields",
        },
    ],
    defaultData: () => ({ selectedFields: "[]" }),
    summarize: (data) => {
        try {
            const fields = JSON.parse(data?.selectedFields ?? "[]");
            return Array.isArray(fields) && fields.length > 0 ? `${fields.length} field${fields.length === 1 ? "" : "s"}` : "No fields selected";
        } catch {
            return "All fields";
        }
    },
};

export default projectStep;
