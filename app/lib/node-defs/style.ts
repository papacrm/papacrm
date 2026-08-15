import type { ModuleNodeDef } from "./types";

// A styling modifier, not a block of its own — same wiring gesture as
// Class (see class.ts): drag its output dot onto a Label, Div, or Image
// (drag from this node onto that one, the same gesture as wiring a block
// into a View) and lib-server/nodes/view.ts picks up the raw CSS it
// carries and applies it directly to that element's inline `style`
// attribute — see findChainedStyle and resolveStyleAttr in
// lib-server/nodes/style.ts.
//
// Unlike Class, which is restricted to a curated table of pre-built
// Tailwind utility classes so Tailwind's build can find them (see the
// file header comment in tailwindClasses.ts), Style writes straight into
// the `style` attribute at render time — no safelist needed, so anything
// valid CSS works here, including a value baked in from an earlier node
// via {{field}}. The trade-off is the usual one for inline styles:
// nothing here can use pseudo-classes/media queries or override a more
// specific selector the way a real class can — reach for Class first,
// and use Style for the one-off property Class doesn't have a picker
// for, or a value that only earlier node data can supply.
const styleNode: ModuleNodeDef = {
    type: "style",
    label: "Style",
    description: "Apply raw CSS directly to whatever it's connected to (a Label, Div, or Image) via its inline style attribute",
    color: "#7c3aed",
    kind: "action",
    fields: [
        {
            key: "style",
            label: "CSS declarations — use {{field}} for data from an earlier node",
            kind: "textarea",
            placeholder: "color: #eee;\nbackground: #111;\npadding: 4px 8px;",
        },
    ],
    defaultData: () => ({ style: "" }),
    summarize: (data) => (data?.style ? `${String(data.style).length} chars` : "No style set"),
};

export default styleNode;
