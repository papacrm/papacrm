import type { ModuleNodeDef } from "./types";

const COLOR_OPTIONS = [
    { value: "yellow", label: "Yellow" },
    { value: "pink", label: "Pink" },
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "purple", label: "Purple" },
    { value: "gray", label: "Gray" },
];

// Purely cosmetic sticky note for leaving a description or explanation
// somewhere on the canvas. No handles (kind: "annotation"), never wired
// to anything, never runs — see lib-server/nodes/comment.ts for the
// (unreachable) executor stub kept only so the type satisfies
// NODE_EXECUTORS. Resizable by dragging its corner handle in the editor
// (see ModuleEditor.tsx's nodeSize()/resizeRef) — width/height below are
// just the same values, editable as text too.
const commentNode: ModuleNodeDef = {
    type: "comment",
    label: "Comment",
    description: "A sticky note for describing part of the flow — purely cosmetic, doesn't run",
    color: "#eab308",
    kind: "annotation",
    fields: [
        { key: "text", label: "Text", kind: "textarea", placeholder: "Explain what's going on here…" },
        { key: "color", label: "Color", kind: "select", options: COLOR_OPTIONS },
        { key: "width", label: "Width (px)", kind: "text", placeholder: "220" },
        { key: "height", label: "Height (px)", kind: "text", placeholder: "140" },
    ],
    defaultData: () => ({ text: "", color: "yellow", width: "220", height: "140" }),
    summarize: (data) => (data?.text ? String(data.text) : "Empty comment"),
};

export default commentNode;
