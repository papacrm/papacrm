import type { WorkflowNodeDef } from "./types";

const saveRecordStep: WorkflowNodeDef = {
    type: "saveRecord",
    label: "Save to Database",
    description: "Stores the current form data as a record",
    color: "#be185d",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: () => "Stores the current data",
};

export default saveRecordStep;