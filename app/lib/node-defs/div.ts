import type { ModuleNodeDef } from "./types";

// Page-building block — a plain container, the layout building block for
// a page. By default a Div lays its children out as a plain flex
// container — connect a Class node into it (see class.ts) and pick a
// Direction to control row vs. column, gaps, alignment, etc., same as
// any other flex box. It only switches to View's own explicit
// 12-column grid-with-positions system once a block inside it has
// actually been dragged/resized in the Layout designer — see
// hasCustomLayout in lib-server/nodes/view.ts and the "div" case in
// app/components/webhooks/BlockGrid.tsx for exactly where that split
// happens. Its `data.layout` is read directly by lib-server/nodes/
// view.ts, same idea as a View's.
//
// A Div has no visual style of its own — connect a Class node into it
// (drag from the Class node's output dot onto this Div) to pick up
// flex direction, spacing, alignment, color, etc. See class.ts.
const divNode: ModuleNodeDef = {
    type: "div",
    label: "Div",
    description: "A container you place other blocks inside — connect a Class node into it to style it",
    color: "#65a30d",
    kind: "action",
    // Everything else (direction, alignment, color, padding, ...) still
    // needs a Class node chained in (see the comment above and class.ts),
    // but gap is common enough — and meaningless on its own without a
    // flex container — that it's offered directly here too: picking one
    // implies `flex` the same way a Class node's own `gap` does (see
    // resolveClassName's caller in lib-server/nodes/view.ts). A Class
    // node's own `gap`, if one is chained in, takes priority over this.
    fields: [
        {
            key: "gap",
            label: "Gap",
            kind: "select",
            options: [
                { value: "", label: "None" },
                { value: "0", label: "0" },
                { value: "1", label: "1 (0.25rem)" },
                { value: "2", label: "2 (0.5rem)" },
                { value: "3", label: "3 (0.75rem)" },
                { value: "4", label: "4 (1rem)" },
                { value: "6", label: "6 (1.5rem)" },
                { value: "8", label: "8 (2rem)" },
                { value: "10", label: "10 (2.5rem)" },
                { value: "12", label: "12 (3rem)" },
            ],
        },
    ],
    defaultData: () => ({ layout: "{}", gap: "" }),
    summarize: (data) => (data?.gap ? `Container · gap-${data.gap}` : "Container"),
};

export default divNode;
