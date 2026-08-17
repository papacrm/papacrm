import type { ModuleNodeDef } from "./types";

const nowNode: ModuleNodeDef = {
    type: "now",
    label: "Now",
    description: "Returns the current time as a number (Unix epoch milliseconds) — not a formatted string",
    color: "#0d9488",
    kind: "action",
    fields: [{ key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "now" }],
    defaultData: () => ({ as: "now" }),
    summarize: (data) => (data?.as ? `Now → ${data.as}` : "No field name set"),
};

export default nowNode;
