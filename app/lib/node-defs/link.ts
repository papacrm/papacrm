import type { ModuleNodeDef } from "./types";

const linkNode: ModuleNodeDef = {
    type: "link",
    label: "Link",
    description: "A clickable link — place it in a View or chain it to a ListView to make rows clickable",
    color: "#0ea5e9",
    kind: "action",
    fields: [
        {
            key: "href",
            label: "URL",
            kind: "text",
            placeholder: "{{ url }} or /path",
        },
    ],
    defaultData: () => ({ href: "" }),
    summarize: (data) => {
        const href = data?.href ?? "";
        return href ? `Link → ${href}` : "No URL set";
    },
};

export default linkNode;
