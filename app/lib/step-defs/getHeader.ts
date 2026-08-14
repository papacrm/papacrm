import type { WorkflowNodeDef } from "./types";

const getHeaderStep: WorkflowNodeDef = {
    type: "getHeader",
    label: "Get Header",
    description: "Reads a header sent with the webhook request",
    color: "#ca8a04",
    kind: "action",
    fields: [
        { key: "name", label: "Header name", kind: "text", placeholder: "authorization" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "authHeader" },
    ],
    defaultData: () => ({ name: "", as: "" }),
    summarize: (data) => (data?.name ? `Get ${data.name}` : "No header name set"),
};

export default getHeaderStep;
