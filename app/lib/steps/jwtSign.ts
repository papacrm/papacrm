import type { WorkflowNodeDef } from "./types";

const jwtSignStep: WorkflowNodeDef = {
    type: "jwtSign",
    label: "JWT Sign",
    description: "Signs a JSON payload into a token, using data from an earlier step",
    color: "#9f1239",
    kind: "action",
    fields: [
        {
            key: "payload",
            label: "Payload (JSON) — use {{field}} for data from an earlier step",
            kind: "textarea",
            placeholder: '{"userId": "{{userId}}"}',
        },
        {
            key: "secretEnv",
            label: "Secret — name of an environment variable (never stored here)",
            kind: "text",
            placeholder: "JWT_SECRET",
        },
        { key: "expiresIn", label: "Expires in (seconds, optional)", kind: "text", placeholder: "900" },
        { key: "as", label: "Save token as (used later as {{field}})", kind: "text", placeholder: "token" },
    ],
    defaultData: () => ({ payload: JSON.stringify({ userId: "{{userId}}" }, null, 2), secretEnv: "", expiresIn: "", as: "token" }),
    summarize: (data) => (data?.secretEnv ? `Sign with ${data.secretEnv}` : "No secret env var set"),
};

export default jwtSignStep;
