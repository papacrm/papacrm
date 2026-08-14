import type { WorkflowNodeDef } from "./types";

const httpRequestStep: WorkflowNodeDef = {
    type: "httpRequest",
    label: "HTTP Request",
    description: "Calls an external URL",
    color: "#7c3aed",
    kind: "action",
    fields: [
        { key: "url", label: "URL", kind: "text", placeholder: "https://api.example.com/endpoint" },
        {
            key: "method",
            label: "Method",
            kind: "select",
            options: [
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
                { value: "PUT", label: "PUT" },
                { value: "DELETE", label: "DELETE" },
            ],
        },
        { key: "headers", label: "Headers (JSON)", kind: "textarea", placeholder: '{"Authorization": "Bearer ..."}' },
        {
            key: "body",
            label: "Body — use {{field}} for data from an earlier step",
            kind: "textarea",
            placeholder: '{"email": "{{email}}"}',
        },
    ],
    defaultData: () => ({ url: "", method: "GET", headers: "", body: "" }),
    summarize: (data) => `${data?.method ?? "GET"} ${data?.url || "no URL set"}`,
};

export default httpRequestStep;