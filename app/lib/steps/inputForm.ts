import type { WorkflowNodeDef } from "./types";

const inputFormStep: WorkflowNodeDef = {
    type: "inputForm",
    label: "Input Form",
    description: "Shows a form; the workflow continues when it's submitted. Has no address of its own — reach it by wiring a Webhook (or another step) into it. That earlier step's URL is what serves the form.",
    color: "#0891b2",
    // A workflow can wire another step's output into Input Form (Webhook →
    // Input Form, or Input Form → Input Form) to chain forms together — the
    // person just sees this step's form next. `kind: "action"` is what
    // gives it both an input handle (so it can be a connection target) and
    // an output handle in the editor. Unlike Webhook, it has no path of its
    // own and can't be a workflow's entry point — see lib/steps/inputForm.ts
    // for how the engine tells "render this form" apart from "this request
    // is this form's submission."
    kind: "action",
    fields: [
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
        title: "Tell us about yourself",
        fields: JSON.stringify([{ name: "email", label: "Email", type: "email" }], null, 2),
        submitLabel: "Submit",
    }),
    summarize: (data) => `Form: ${data?.title || "Untitled"}`,
};

export default inputFormStep;