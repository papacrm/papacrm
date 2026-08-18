import type { ModuleNodeDef } from "./types";

// Unlike List (lib/node-defs/list.ts), which always points at one specific
// list picked from a dropdown at design time, this resolves a list by
// *name* at run time — supports the same `{{field}}` templating as Static
// Page/HTTP Request, so the name can come from the current request — and
// creates it on the spot if no list with that name exists yet for this
// module's owner. See lib-server/nodes/listUpsert.ts for the find-or-
// create logic and the schema JSON shape.
const listUpsertNode: ModuleNodeDef = {
    type: "listUpsert",
    label: "List (create if not exists)",
    description: "Finds a list by name, or creates it from a JSON schema if none exists yet — chain to Find One, Save to List, Match, etc. This node doesn't need input from the left.",
    color: "#6366f1",
    kind: "trigger",
    fields: [
        {
            key: "name",
            label: "List name",
            kind: "text",
            placeholder: "e.g. Subscribers or {{body.listName}}",
        },
        {
            key: "schema",
            label: "Schema (JSON, used only if the list doesn't exist yet)",
            kind: "textarea",
            placeholder: '[\n  { "key": "email", "label": "Email", "type": "text", "unique": true }\n]',
        },
    ],
    defaultData: () => ({ name: "", schema: "[]" }),
    summarize: (data) => (data?.name ? `List: ${data.name}` : "No name set"),
    inspectorNote: (data) =>
        data?.name
            ? {
                  label: "Tip",
                  value: "This node doesn't require input from the left — it's a source node. Chain it to nodes like Find One, Save to List, Match, or other list-processing nodes.",
              }
            : {
                  label: "Tip",
                  value: "Give it a name — plain text or a {{field}} template. Each field in the schema needs a key, label, and type (text, number, boolean, date, or select); add \"unique\": true to a field to stop two documents from ever sharing a value for it.",
              },
};

export default listUpsertNode;
