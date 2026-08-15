import type { ModuleNodeDef } from "./types";

const jwtVerifyNode: ModuleNodeDef = {
    type: "jwtVerify",
    label: "JWT Verify",
    description: "Checks a token's signature. True = valid, False = missing/invalid/expired",
    color: "#be123c",
    kind: "branch",
    fields: [
        {
            key: "token",
            label: "Token — use {{field}} for data from an earlier node",
            kind: "text",
            placeholder: "{{token}}",
        },
        {
            key: "secretEnv",
            label: "Secret — name of an environment variable (never stored here)",
            kind: "text",
            placeholder: "JWT_SECRET",
        },
        { key: "as", label: "Save decoded payload as (used later as {{field}})", kind: "text", placeholder: "payload" },
    ],
    defaultData: () => ({ token: "{{token}}", secretEnv: "", as: "payload" }),
    summarize: (data) => (data?.secretEnv ? `Verify with ${data.secretEnv}` : "No secret env var set"),
};

export default jwtVerifyNode;
