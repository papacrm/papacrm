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
    fields: [],
    defaultData: () => ({ layout: "{}" }),
    summarize: () => "Container",
};

export default divNode;
