import type { ModuleNodeDef } from "./types";

const mapperNode: ModuleNodeDef = {
    type: "mapper",
    label: "Mapper",
    description:
        "Reshapes data from the previous node before passing it on. Wire in more than one node and set \"Multiple inputs\" to \"Wait\" in the inspector to map from all of them at once — they're combined into a single object first, so just use {{field}}; if two inputs share a field name, whichever one arrives last wins.",
    color: "#4338ca",
    kind: "action",
    fields: [
        {
            key: "mapping",
            label: "Mapping (JSON) — use {{field}} for data from an earlier node. With multiple inputs (Wait mode), they're combined into one object first — {{field}} still works, and the last input to arrive wins if two share a name",
            kind: "textarea",
            placeholder: '{"fullName": "{{firstName}} {{lastName}}", "email": "{{email}}"}',
        },
        {
            key: "mode",
            label: "Mode",
            kind: "select",
            options: [
                { value: "replace", label: "Replace data with the mapping result" },
                { value: "merge", label: "Merge mapping result into existing data" },
            ],
        },
    ],
    defaultData: () => ({ mapping: JSON.stringify({ field: "{{field}}" }, null, 2), mode: "replace" }),
    summarize: (data) => {
        try {
            const keys = Object.keys(JSON.parse(data?.mapping ?? "{}"));
            return keys.length ? `Maps ${keys.join(", ")}` : "No mapping set";
        } catch {
            return "Invalid mapping JSON";
        }
    },
};

export default mapperNode;