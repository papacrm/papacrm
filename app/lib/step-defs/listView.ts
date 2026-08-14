import type { WorkflowNodeDef } from "./types";

// Same data source as Table (whatever the previous step handed it — see
// lib/steps/table.ts's resolveRows), just rendered as a plain <ul>/<li>
// list instead of a table. Chain a View, Card, or Link into this step (drag
// from that step's own output dot onto this node) to control how each item
// renders — see lib/steps/listView.ts on the server (resolveListItems),
// lib/steps/card.ts, and lib/steps/view.ts.
const listViewStep: WorkflowNodeDef = {
    type: "listView",
    label: "List View",
    description: "Responds with a page listing the previous step's data as a <ul>/<li> list — chain a View into it to show the View as each item's template",
    color: "#0e7490",
    kind: "action",
    fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Recent submissions" }],
    defaultData: () => ({ title: "Records" }),
    summarize: (data) => `${data?.title || "List"}: shows the previous step's data as a list`,
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query step, an Input Form, or a webhook's own query string/POST body, same as Table. Chain a View, Card, or Link into it to control how each item looks.",
    }),
};

export default listViewStep;
