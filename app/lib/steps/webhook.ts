import { randomSlug, publicHookNote, type WorkflowNodeDef } from "./types";

const webhookStep: WorkflowNodeDef = {
    type: "webhook",
    label: "Webhook",
    description: "Starts the workflow when a URL is requested",
    color: "#2563eb",
    kind: "trigger",
    fields: [
        { key: "path", label: "Path", kind: "text", placeholder: "my-endpoint" },
        {
            key: "method",
            label: "Method",
            kind: "select",
            options: [
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
            ],
        },
    ],
    defaultData: () => ({ path: randomSlug(), method: "POST" }),
    summarize: (data) => `${data?.method ?? "POST"} /hooks/${data?.path || "…"}`,
    inspectorNote: publicHookNote,
};

export default webhookStep;
