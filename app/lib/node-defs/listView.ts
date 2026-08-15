import type { ModuleNodeDef } from "./types";

// Same data source as Table (whatever the previous node handed it — see
// lib/nodes/table.ts's resolveRows), just rendered as a plain <ul>/<li>
// list instead of a table. Chain a View, Card, or Link into this node (drag
// from that node's own output dot onto this node) to control how each item
// renders — see lib/nodes/listView.ts on the server (resolveListItems),
// lib/nodes/card.ts, and lib/nodes/view.ts.
const listViewNode: ModuleNodeDef = {
    type: "listView",
    label: "List View",
    description: "Responds with a page listing the previous node's data as a <ul>/<li> list — chain a View into it to show the View as each item's template",
    color: "#0e7490",
    kind: "action",
    fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Recent submissions" }],
    defaultData: () => ({ title: "Records" }),
    summarize: (data) => `${data?.title || "List"}: shows the previous node's data as a list`,
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query node, an Input Form, or a webhook's own query string/POST body, same as Table. Chain a View, Card, or Link into it to control how each item looks.",
    }),
};

export default listViewNode;
