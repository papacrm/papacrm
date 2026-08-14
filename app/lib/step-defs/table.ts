import type { WorkflowNodeDef } from "./types";

const tableStep: WorkflowNodeDef = {
    type: "table",
    label: "Table",
    description: "Responds with a page listing whatever data the previous step handed it",
    color: "#0369a1",
    kind: "terminal",
    fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Recent submissions" }],
    defaultData: () => ({ title: "Records" }),
    summarize: () => "Shows the previous step's data as a table",
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query step, an Input Form, or a webhook's own query string/POST body — Table renders whatever rows it receives.",
    }),
};

export default tableStep;