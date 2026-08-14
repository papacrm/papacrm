import type { WorkflowNodeDef } from "./types";

const setCookieStep: WorkflowNodeDef = {
    type: "setCookie",
    label: "Set Cookie",
    description: "Adds a Set-Cookie header to the response, using data from an earlier step",
    color: "#65a30d",
    kind: "action",
    fields: [
        { key: "name", label: "Cookie name", kind: "text", placeholder: "session_id" },
        {
            key: "value",
            label: "Value — use {{field}} for data from an earlier step",
            kind: "text",
            placeholder: "{{token}}",
        },
        { key: "maxAge", label: "Max age (seconds, optional)", kind: "text", placeholder: "3600" },
        {
            key: "httpOnly",
            label: "HTTP only",
            kind: "select",
            options: [
                { value: "false", label: "No — readable by client-side JS" },
                { value: "true", label: "Yes — server only" },
            ],
        },
    ],
    defaultData: () => ({ name: "", value: "{{token}}", maxAge: "", httpOnly: "false" }),
    summarize: (data) => (data?.name ? `Set ${data.name}` : "No cookie name set"),
};

export default setCookieStep;
