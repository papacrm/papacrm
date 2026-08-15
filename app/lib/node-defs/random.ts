import type { ModuleNodeDef } from "./types";

const randomNode: ModuleNodeDef = {
    type: "random",
    label: "Random",
    description: "Generates a random alphanumeric string — useful for tokens, nonces, or short-lived codes",
    color: "#9f1239",
    kind: "action",
    fields: [
        { key: "length", label: "Length", kind: "text", placeholder: "16" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "token" },
    ],
    defaultData: () => ({ length: "16", as: "token" }),
    summarize: (data) => (data?.as ? `Random → ${data.as}` : "No field name set"),
};

export default randomNode;
