import type { WorkflowNodeDef } from "./types";

const jsonStep: WorkflowNodeDef = {
    type: "json",
    label: "JSON",
    description: "Responds with raw JSON — an object or an array — instead of a page",
    color: "#b45309",
    kind: "terminal",
    fields: [
        {
            key: "body",
            label: "Body (JSON, object or array) — use {{field}} for data from an earlier step",
            kind: "textarea",
            placeholder: '{"success": true, "id": "{{id}}"}',
        },
        { key: "status", label: "Status code (optional)", kind: "text", placeholder: "200" },
    ],
    defaultData: () => ({ body: JSON.stringify({ success: true }, null, 2), status: "200" }),
    summarize: (data) => {
        try {
            const parsed = JSON.parse(data?.body ?? "null");
            return Array.isArray(parsed) ? `Array (${parsed.length} item${parsed.length === 1 ? "" : "s"})` : "Object";
        } catch {
            return "No body set";
        }
    },
};

export default jsonStep;
