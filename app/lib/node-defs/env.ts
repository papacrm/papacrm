import type { ModuleNodeDef } from "./types";

const envNode: ModuleNodeDef = {
    type: "env",
    label: "Env",
    description: "Reads a server environment variable, e.g. NODE_ENV",
    color: "#0d9488",
    kind: "action",
    fields: [
        { key: "name", label: "Variable name", kind: "text", placeholder: "NODE_ENV" },
        { key: "fallback", label: "Fallback (if unset)", kind: "text", placeholder: "development" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "nodeEnv" },
    ],
    defaultData: () => ({ name: "NODE_ENV", fallback: "", as: "nodeEnv" }),
    summarize: (data) => (data?.name ? `Env → ${data.name}` : "No variable name set"),
};

export default envNode;
