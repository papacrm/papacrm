import { randomSlug, publicHookNote, type WorkflowNodeDef } from "./types";

const inputFormStep: WorkflowNodeDef = {
    type: "inputForm",
    label: "Input Form",
    description: "Shows a form and starts the workflow when it's submitted",
    color: "#0891b2",
    kind: "trigger",
    fields: [
        { key: "path", label: "Path", kind: "text", placeholder: "signup" },
        { key: "title", label: "Form title", kind: "text", placeholder: "Tell us about yourself" },
        {
            key: "fields",
            label: "Fields (JSON)",
            kind: "textarea",
            placeholder: '[{"name": "email", "label": "Email", "type": "email"}]',
        },
        { key: "submitLabel", label: "Submit button label", kind: "text", placeholder: "Submit" },
    ],
    defaultData: () => ({
        path: randomSlug(),
        title: "Tell us about yourself",
        fields: JSON.stringify([{ name: "email", label: "Email", type: "email" }], null, 2),
        submitLabel: "Submit",
    }),
    summarize: (data) => `Form at /hooks/${data?.path || "…"}`,
    inspectorNote: publicHookNote,
};

export default inputFormStep;
