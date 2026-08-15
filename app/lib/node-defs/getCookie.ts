import type { ModuleNodeDef } from "./types";

const getCookieNode: ModuleNodeDef = {
    type: "getCookie",
    label: "Get Cookie",
    description: "Reads a cookie sent with the webhook request",
    color: "#4d7c0f",
    kind: "action",
    fields: [
        { key: "name", label: "Cookie name", kind: "text", placeholder: "session_id" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "sessionId" },
    ],
    defaultData: () => ({ name: "", as: "" }),
    summarize: (data) => (data?.name ? `Get ${data.name}` : "No cookie name set"),
};

export default getCookieNode;
