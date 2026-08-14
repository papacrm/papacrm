import type { WorkflowNodeDef } from "./types";

const tabsStep: WorkflowNodeDef = {
    type: "tabs",
    label: "Tabs",
    description: "A tabbed panel of HTML content — connect it into a View to place it on the page",
    color: "#0e7490",
    kind: "action",
    fields: [
        {
            key: "tabs",
            label: "Tabs (JSON)",
            kind: "textarea",
            placeholder: '[{"label": "Overview", "html": "<p>...</p>"}, {"label": "Details", "html": "<p>...</p>"}]',
        },
    ],
    defaultData: () => ({ tabs: JSON.stringify([{ label: "Tab 1", html: "<p>Content</p>" }], null, 2) }),
    summarize: (data) => {
        try {
            const tabs = JSON.parse(data?.tabs ?? "[]");
            return Array.isArray(tabs) ? `${tabs.length} tab${tabs.length === 1 ? "" : "s"}` : "No tabs set";
        } catch {
            return "No tabs set";
        }
    },
};

export default tabsStep;
