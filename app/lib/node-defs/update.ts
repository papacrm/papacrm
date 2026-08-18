import type { ModuleNodeDef } from "./types";

// Sibling of Match (./match.ts): Match supplies the "which document"
// criteria, this supplies the "set these fields" data. Chain one of each
// into an Update One node (see ./updateOne.ts) so it knows what to find
// and what to set — Update One no longer carries that JSON itself.
const updateNode: ModuleNodeDef = {
    type: "update",
    label: "Update",
    description:
        "Fields to set on a document — chain into Update One. Use {{field}} for data from an earlier node. Used on its own (not chained into Update One), it just merges these fields into the current data instead.",
    color: "#059669",
    kind: "action",
    fields: [
        {
            key: "update",
            label: "Update (JSON) — fields to set. Use {{field}} for data from an earlier node",
            kind: "textarea",
            placeholder: '{"status": "active"}',
        },
    ],
    defaultData: () => ({ update: JSON.stringify({ field: "{{field}}" }, null, 2) }),
    summarize: (data) => {
        try {
            const keys = Object.keys(JSON.parse(data?.update ?? "{}"));
            return keys.length ? `Set ${keys.join(", ")}` : "No update set";
        } catch {
            return "Invalid update JSON";
        }
    },
};

export default updateNode;
