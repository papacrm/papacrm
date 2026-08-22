import type { ModuleNodeDef } from "./types";

const mapperNode: ModuleNodeDef = {
    type: "mapper",
    label: "Mapper",
    description:
        "Reshapes data from the previous node before passing it on. Wire in more nodes with \"data\" edges (click the icon on the connection to switch it) to map from all of them at once — {{field}} reads whatever's currently merged in, and a data edge's value wins over the workflow chain's own on a shared field name.",
    color: "#4338ca",
    kind: "action",
    fields: [
        {
            key: "mapping",
            label: "Mapping (JSON) — use {{field}} for data from an earlier node, including anything merged in from a \"data\" edge",
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