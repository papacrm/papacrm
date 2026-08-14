import type { WorkflowNodeDef } from "./types";

// Page-building block — a plain container, the layout building block for
// a page. Works exactly like View's own block-placement grid (see
// view.ts and the "Layout" section WorkflowEditor.tsx renders for a
// selected node): connect any other block (Label, Gap, Image, another
// Div, ...) into a Div and place it on its own 12-column grid, same as
// inside a View — a Div is just a nestable region rather than a whole
// page. Its `data.layout` is read directly by lib-server/steps/view.ts,
// same idea as a View's.
//
// A Div has no visual style of its own — connect a Class step into it
// (drag from the Class step's output dot onto this Div) to pick up
// spacing, alignment, color, etc. See class.ts.
const divStep: WorkflowNodeDef = {
    type: "div",
    label: "Div",
    description: "A container you place other blocks inside — connect a Class step into it to style it",
    color: "#65a30d",
    kind: "action",
    fields: [],
    defaultData: () => ({ layout: "{}" }),
    summarize: () => "Container",
};

export default divStep;
