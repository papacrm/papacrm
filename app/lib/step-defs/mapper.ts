import type { WorkflowNodeDef } from "./types";

const mapperStep: WorkflowNodeDef = {
    type: "mapper",
    label: "Mapper",
    description: "Reshapes data from the previous step before passing it on",
    color: "#4338ca",
    kind: "action",
    fields: [
        {
            key: "mapping",
            label: "Mapping (JSON) — use {{field}} for data from an earlier step",
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

export default mapperStep;