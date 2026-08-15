import type { ModuleNodeDef } from "./types";

const setHeaderNode: ModuleNodeDef = {
    type: "setHeader",
    label: "Set Header",
    description: "Adds a header to the response, using data from an earlier node",
    color: "#a16207",
    kind: "action",
    fields: [
        { key: "name", label: "Header name", kind: "text", placeholder: "X-Custom-Header" },
        {
            key: "value",
            label: "Value — use {{field}} for data from an earlier node",
            kind: "text",
            placeholder: "{{value}}",
        },
    ],
    defaultData: () => ({ name: "", value: "" }),
    summarize: (data) => (data?.name ? `Set ${data.name}` : "No header name set"),
};

export default setHeaderNode;
