import type { ModuleNodeDef } from "./types";

const staticPageNode: ModuleNodeDef = {
    type: "staticPage",
    label: "Page",
    description: "Responds with an HTML page",
    color: "#059669",
    kind: "terminal",
    fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "Thanks!" },
        {
            key: "html",
            label: "HTML — use {{field}} for data from an earlier node",
            kind: "html",
            placeholder: "<h1>Thanks, {{name}}!</h1>",
        },
    ],
    defaultData: () => ({ title: "Thanks!", html: "<h1>Thanks!</h1>\n<p>This page was returned by a module.</p>" }),
    summarize: (data) => data?.title || "Untitled page",
};

export default staticPageNode;