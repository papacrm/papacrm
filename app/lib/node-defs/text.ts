import type { ModuleNodeDef } from "./types";

const textNode: ModuleNodeDef = {
    type: "text",
    label: "Text",
    description: "Responds with raw plain text instead of a page or JSON — for a webhook consumed by another program",
    color: "#b45309",
    kind: "terminal",
    fields: [
        {
            key: "body",
            label: "Body — use {{field}} for data from an earlier node",
            kind: "textarea",
            placeholder: "OK",
        },
        { key: "status", label: "Status code (optional)", kind: "text", placeholder: "200" },
    ],
    defaultData: () => ({ body: "OK", status: "200" }),
    summarize: (data) => (data?.body ? `${String(data.body).length} chars` : "No body set"),
};

export default textNode;
