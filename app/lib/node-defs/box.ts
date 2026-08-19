import type { ModuleNodeDef } from "./types";

// Purely cosmetic — draws a big, titled, dashed rectangle on the canvas so
// related nodes can be dragged inside it for a tidier layout. It has no
// input/output handles (kind: "annotation"), is never wired to anything,
// and never runs — see lib-server/nodes/box.ts for the (unreachable)
// executor stub kept only so the type satisfies NODE_EXECUTORS.
const boxNode: ModuleNodeDef = {
    type: "box",
    label: "Group Box",
    description: "A resizable, titled box for visually grouping nodes together — purely cosmetic, doesn't run",
    color: "#94a3b8",
    kind: "annotation",
    fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "e.g. Auth flow" },
        { key: "width", label: "Width (px)", kind: "text", placeholder: "360" },
        { key: "height", label: "Height (px)", kind: "text", placeholder: "240" },
    ],
    defaultData: () => ({ title: "Group", width: "360", height: "240" }),
    summarize: (data) => data?.title || "Untitled group",
};

export default boxNode;
