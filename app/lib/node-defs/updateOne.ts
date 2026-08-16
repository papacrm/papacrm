import type { ModuleNodeDef } from "./types";

// No list picker of its own — same forward-chaining as Save to List
// (lib/node-defs/saveToList.ts): whichever List or List (create if not
// exists) node is chained right *after* this one is what it updates.
// See lib-server/nodes/updateOne.ts (and lib-server/nodes/listResolve.ts,
// shared with Save to List) for the actual update logic.
const updateOneNode: ModuleNodeDef = {
    type: "updateOne",
    label: "Update One",
    description:
        "Finds one document in whichever list the next node (a List or List (create if not exists) node) resolves to, using Match, and applies Update to it. With Upsert on, creates a new document from Match + Update when nothing matches. Passes the resulting document on as the output.",
    color: "#0d9488",
    kind: "action",
    fields: [
        {
            key: "match",
            label: 'Match (JSON) — which document to find. Use "_id" to match by id, or a field key to match {{field}} against the list\'s data',
            kind: "textarea",
            placeholder: '{"email": "{{email}}"}',
        },
        {
            key: "update",
            label: "Update (JSON) — fields to set on the matched (or upserted) document. Use {{field}} for data from an earlier node",
            kind: "textarea",
            placeholder: '{"status": "active"}',
        },
        {
            key: "upsert",
            label: "Insert if no match is found",
            kind: "toggle",
        },
    ],
    defaultData: () => ({
        match: JSON.stringify({ _id: "{{_id}}" }, null, 2),
        update: JSON.stringify({ field: "{{field}}" }, null, 2),
        upsert: false,
    }),
    summarize: (data) => {
        try {
            const matchKeys = Object.keys(JSON.parse(data?.match ?? "{}"));
            const updateKeys = Object.keys(JSON.parse(data?.update ?? "{}"));
            const parts: string[] = [];
            if (matchKeys.length) parts.push(`where ${matchKeys.join(", ")}`);
            if (updateKeys.length) parts.push(`set ${updateKeys.join(", ")}`);
            const summary = parts.length ? parts.join(" — ") : "No match/update set";
            return data?.upsert === true ? `${summary} (upsert)` : summary;
        } catch {
            return "Invalid match/update JSON";
        }
    },
    inspectorNote: () => ({
        label: "Tip",
        value: "Chain this right before a List or List (create if not exists) node — that's what tells it which list to update.",
    }),
};

export default updateOneNode;
