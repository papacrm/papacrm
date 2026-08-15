import { randomSlug, publicHookNote, type ModuleNodeDef } from "./types";

const webhookNode: ModuleNodeDef = {
    type: "webhook",
    label: "Webhook",
    description: "Starts the module when a URL is requested",
    color: "#2563eb",
    kind: "trigger",
    fields: [
        { key: "path", label: "Path", kind: "text", placeholder: "my-endpoint" },
        {
            key: "method",
            label: "Method",
            kind: "select",
            options: [
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
            ],
        },
        // Lets a single Webhook node be switched on/off without deleting
        // it or deactivating the whole module — see `active` gating in
        // app/lib-server/nodes/webhook.ts's matchesTrigger. Old nodes
        // saved before this field existed have no `active` key at all,
        // so it's treated as on by default (see the `!== false` checks).
        { key: "active", label: "Active", kind: "toggle" },
    ],
    defaultData: () => ({ path: randomSlug(), method: "GET", active: true }),
    summarize: (data) => `${data?.method ?? "GET"} /${data?.path || "…"}${data?.active === false ? " (inactive)" : ""}`,
    inspectorNote: publicHookNote,
};

export default webhookNode;