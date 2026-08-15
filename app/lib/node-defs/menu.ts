import type { ModuleNodeDef } from "./types";

const menuNode: ModuleNodeDef = {
    type: "menu",
    label: "Menu",
    description: "A list of links, rendered with NukeJS's client-side Link — connect it into a View to place it on the page",
    color: "#0891b2",
    kind: "action",
    fields: [
        {
            key: "links",
            label: "Links (JSON)",
            kind: "textarea",
            placeholder: '[{"label": "Home", "href": "/"}, {"label": "About", "href": "/about"}]',
        },
        {
            key: "orientation",
            label: "Orientation",
            kind: "select",
            options: [
                { value: "horizontal", label: "Horizontal — in a row" },
                { value: "vertical", label: "Vertical — stacked" },
            ],
        },
    ],
    defaultData: () => ({ links: JSON.stringify([{ label: "Home", href: "/" }], null, 2), orientation: "horizontal" }),
    summarize: (data) => {
        try {
            const links = JSON.parse(data?.links ?? "[]");
            return Array.isArray(links) ? `${links.length} link${links.length === 1 ? "" : "s"}` : "No links set";
        } catch {
            return "No links set";
        }
    },
};

export default menuNode;
