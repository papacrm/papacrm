import type { ModuleNodeDef } from "./types";

// Purely cosmetic — draws a big, titled, dashed rectangle on the canvas so
// related nodes can be dragged inside it for a tidier layout. It has no
// input/output handles (kind: "annotation"), is never wired to anything,
// and never runs — see lib-server/nodes/box.ts for the (unreachable)
// executor stub kept only so the type satisfies NODE_EXECUTORS.
//
// Size is drag-to-resize only (see the corner handle + resizeRef in
// ModuleEditor.tsx) — there's no Width/Height field here anymore, so the
// only way to resize is the handle itself, and Shrink mode (see `mode`
// below) can override the size entirely.
//
// `mode` controls how the box relates to the nodes visually inside it:
//   - "current": today's behavior — purely cosmetic, nodes inside are
//     never moved or affected by the box.
//   - "lock": dragging the box also drags every node currently inside
//     its bounds, keeping the group moving together as a unit. Doesn't
//     otherwise change appearance.
//   - "shrink": collapses the box down to a small title-only chip.
//     Nodes inside are hidden while shrunk (they aren't deleted or
//     moved — their data is untouched), and any edge that connected a
//     now-hidden node to something outside the group is redrawn to/from
//     the group box itself instead, so the flow still reads correctly
//     at a glance. Switching back out of "shrink" restores everything.
// See ModuleEditor.tsx's nodeSize(), nodesContainedInBox(), and the box
// rendering branch for how each mode is implemented.
const boxNode: ModuleNodeDef = {
    type: "box",
    label: "Group Box",
    description: "A resizable, titled box for visually grouping nodes together — purely cosmetic, doesn't run",
    color: "#94a3b8",
    kind: "annotation",
    fields: [
        { key: "title", label: "Title", kind: "text", placeholder: "e.g. Auth flow" },
        { key: "description", label: "Description", kind: "textarea", placeholder: "What this group is for…" },
        {
            key: "mode",
            label: "Mode",
            kind: "select",
            options: [
                { value: "current", label: "Current — just for show" },
                { value: "lock", label: "Lock — nodes move with it" },
                { value: "shrink", label: "Shrink — collapse to a small box" },
            ],
        },
    ],
    defaultData: () => ({ title: "Group", width: "360", height: "240", description: "", mode: "current" }),
    summarize: (data) => data?.title || "Untitled group",
};

export default boxNode;
