import type { ModuleNodeDef } from "./types";

const navbarNode: ModuleNodeDef = {
    type: "navbar",
    label: "Navbar",
    description: "A top navigation bar with a brand and links — connect it into a View to place it on the page",
    color: "#155e75",
    kind: "action",
    fields: [
        { key: "brand", label: "Brand text", kind: "text", placeholder: "My Company" },
        {
            key: "links",
            label: "Links (JSON)",
            kind: "textarea",
            placeholder: '[{"label": "Home", "href": "/"}, {"label": "About", "href": "/about"}]',
        },
    ],
    defaultData: () => ({ brand: "My Company", links: JSON.stringify([{ label: "Home", href: "/" }], null, 2) }),
    summarize: (data) => (data?.brand ? String(data.brand) : "No brand text set"),
};

export default navbarNode;
