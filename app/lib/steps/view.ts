import type { WorkflowNodeDef } from "./types";

// View is a page-builder step: whatever Menu / Tabs / Navbar / Footer /
// Table / Input Form / Function / another View is connected into it (drag
// from that step's output dot onto this node) shows up as a placeable
// block in this node's inspector — see the "Layout" section
// WorkflowEditor.tsx renders specially for selected View nodes, right
// below the fields below. Layout positions themselves (12-column grid,
// row, height) are stored in this node's own `data.layout`, keyed by each
// connected step's id — there's no field for it here because the layout
// editor is a dedicated visual UI, not something you'd type JSON into by
// hand.
//
// View has its own output dot (kind "action", not "terminal") so it's
// chainable: drag it into another View and it's embedded exactly like any
// other block — a nested page-within-a-page — see the "view" case in
// lib/steps/view.ts and WorkflowEditor.tsx's Layout section, neither of
// which treats a View child any differently from a Menu or Table child.
// That same wire also changes what actually renders: a chained View acts
// as *part of* whatever it's wired into rather than as its own page — see
// viewStep.run() in lib/steps/view.ts, which follows the chain instead of
// finishing at a View that has somewhere else to go.
//
// Wiring a View into anything *other* than a View — most usefully a Call
// step — means something different: render this View's own page normally,
// but instead of answering with it directly, hand it off. Wire it into a
// Call step that calls a shared layout's Function (that Function chained
// into a View built from Navbar/Footer/etc., with the Function itself
// wired into that View as a content slot) and this View's content renders
// inside that shared layout in place of the slot — see the "slot" doc on
// ViewBlock in lib/steps/view.ts and callStep.run() in lib/steps/call.ts.
// That's how one layout gets reused across many different pages, even
// pages that live in entirely different workflows.
const viewStep: WorkflowNodeDef = {
    type: "view",
    label: "View",
    description: "A page you build visually from connected blocks — Menu, Tabs, Navbar, Footer, Table, Input Form, Function, or another View",
    color: "#7c2d12",
    kind: "action",
    fields: [{ key: "title", label: "Page title — use {{field}} for data from an earlier step", kind: "text", placeholder: "{{title}}" }],
    defaultData: () => ({ title: "My Page", layout: "{}" }),
    summarize: (data) => (data?.title ? String(data.title) : "Untitled page"),
};

export default viewStep;
