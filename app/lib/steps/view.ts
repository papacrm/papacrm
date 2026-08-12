import type { WorkflowNodeDef } from "./types";

// View is a page-builder step: whatever Menu / Tabs / Navbar / Footer /
// Table / Input Form / another View is connected into it (drag from that
// step's output dot onto this node) shows up as a placeable block in this
// node's inspector — see the "Layout" section WorkflowEditor.tsx renders
// specially for selected View nodes, right below the fields below. Layout
// positions themselves (12-column grid, row, height) are stored in this
// node's own `data.layout`, keyed by each connected step's id — there's no
// field for it here because the layout editor is a dedicated visual UI,
// not something you'd type JSON into by hand.
const viewStep: WorkflowNodeDef = {
    type: "view",
    label: "View",
    description: "A page you build visually from connected blocks — Menu, Tabs, Navbar, Footer, Table, Input Form, or another View",
    color: "#7c2d12",
    kind: "terminal",
    fields: [{ key: "title", label: "Page title — use {{field}} for data from an earlier step", kind: "text", placeholder: "{{title}}" }],
    defaultData: () => ({ title: "My Page", layout: "{}" }),
    summarize: (data) => (data?.title ? String(data.title) : "Untitled page"),
};

export default viewStep;
