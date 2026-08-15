import type { ModuleNodeDef } from "./types";

const forwardNode: ModuleNodeDef = {
    type: "forward",
    label: "Forward",
    description: "Redirects the request (HTTP 301/302) to another Webhook node's public URL",
    color: "#ea580c",
    // A redirect sends the response immediately — there's nothing
    // meaningful to chain after it, same reasoning as Static Page / JSON
    // Response.
    kind: "terminal",
    // The redirect kind (permanent/temporary) is a plain field; *which*
    // webhook to forward to is a cascading, server-fetched picker like
    // Route's — the editor renders it alongside these fields for the
    // `forward` node type. See ModuleEditor.tsx and `listWebhooks` in
    // app/router/modules.ts.
    fields: [
        {
            key: "mode",
            label: "Redirect type",
            kind: "select",
            options: [
                { value: "temporary", label: "Temporary (302) — the target may change later" },
                { value: "permanent", label: "Permanent (301) — the target is settled for good" },
            ],
        },
    ],
    defaultData: () => ({ moduleId: "", moduleName: "", webhookNodeId: "", webhookPath: "", mode: "temporary" }),
    summarize: (data) => {
        if (!data?.webhookNodeId) return "No webhook selected";
        const target = data?.webhookPath ? `/${data.webhookPath}` : "webhook";
        const kind = data?.mode === "permanent" ? "Permanently" : "Temporarily";
        return `${kind} forwards to ${target}`;
    },
    inspectorNote: (data, ctx) => {
        if (!data?.webhookNodeId || !ctx.origin) return null;
        return { label: "Redirects to", value: `${ctx.origin}/${data.webhookPath || ""}` };
    },
};

export default forwardNode;
