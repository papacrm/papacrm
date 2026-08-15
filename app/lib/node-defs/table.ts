import type { ModuleNodeDef } from "./types";

const tableNode: ModuleNodeDef = {
    type: "table",
    label: "Table",
    description: "Responds with a page listing whatever data the previous node handed it",
    color: "#0369a1",
    kind: "terminal",
    fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Recent submissions" }],
    defaultData: () => ({ title: "Records" }),
    summarize: () => "Shows the previous node's data as a table",
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query node, an Input Form, or a webhook's own query string/POST body — Table renders whatever rows it receives.",
    }),
};

export default tableNode;