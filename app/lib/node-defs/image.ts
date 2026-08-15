import type { ModuleNodeDef } from "./types";

const imageNode: ModuleNodeDef = {
    type: "image",
    label: "Image",
    description: "An image — connect it into a View to place it on the page",
    color: "#0891b2",
    kind: "action",
    fields: [
        { key: "src", label: "Image URL — use {{field}} for data from an earlier node", kind: "text", placeholder: "https://example.com/photo.jpg" },
        { key: "alt", label: "Alt text", kind: "text", placeholder: "Description of the image" },
    ],
    defaultData: () => ({ src: "", alt: "" }),
    summarize: (data) => (data?.src ? String(data.src) : "No image URL set"),
};

export default imageNode;
