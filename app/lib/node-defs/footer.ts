import type { ModuleNodeDef } from "./types";

const footerNode: ModuleNodeDef = {
    type: "footer",
    label: "Footer",
    description: "A page footer with text and optional links — connect it into a View to place it on the page",
    color: "#164e63",
    kind: "action",
    fields: [
        { key: "text", label: "Text", kind: "text", placeholder: "© 2026 My Company" },
        {
            key: "links",
            label: "Links (JSON, optional)",
            kind: "textarea",
            placeholder: '[{"label": "Privacy", "href": "/privacy"}]',
        },
    ],
    defaultData: () => ({ text: "© 2026 My Company", links: "[]" }),
    summarize: (data) => (data?.text ? String(data.text) : "No text set"),
};

export default footerNode;
