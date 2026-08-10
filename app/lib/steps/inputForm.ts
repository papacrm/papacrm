import { randomSlug, publicHookNote, type WorkflowNodeDef } from "./types";

const inputFormStep: WorkflowNodeDef = {
    type: "inputForm",
    label: "Input Form",
    description: "Shows a form; the workflow continues when it's submitted. Can be the workflow's entry point, or reached from an earlier step (e.g. another Input Form).",
    color: "#0891b2",
    // Unlike Webhook, Input Form isn't trigger-only: a workflow can also
    // wire another step's output into it (Input Form → Input Form, or
    // webhook → Input Form) to chain forms together — the person just sees
    // this step's form next. `kind: "action"` is what gives it both an
    // input handle (so it can be a connection target) and an output handle
    // in the editor; it's still independently reachable at its own /<path>
    // via the server's matchesTrigger check either way. See the isEntry
    // note in lib/steps/inputForm.ts for how the engine tells "this is the
    // request's own entry" apart from "this was reached mid-chain."
    kind: "action",
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
    summarize: (data) => `Form at /${data?.path || "…"}`,
    inspectorNote: publicHookNote,
};

export default inputFormStep;