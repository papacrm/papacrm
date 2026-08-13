import type { WorkflowNodeDef } from "./types";

// Same data source as Table (whatever the previous step handed it — see
// lib/steps/table.ts's resolveRows), just rendered as a plain <ul>/<li>
// list instead of a table. Chain a Card into this step (drag from the
// Card's own output dot onto this node) and each <li> renders using that
// Card's title/subtitle/body template instead of a plain field dump —
// see lib/steps/listView.ts on the server (resolveListItems) and
// lib/steps/card.ts.
const listViewStep: WorkflowNodeDef = {
    type: "listView",
    label: "List View",
    description: "Responds with a page listing the previous step's data as a <ul>/<li> list — chain a Card into it to use the Card as each item's template",
    color: "#0e7490",
    kind: "terminal",
    fields: [{ key: "title", label: "Title", kind: "text", placeholder: "Recent submissions" }],
    defaultData: () => ({ title: "Records" }),
    summarize: () => "Shows the previous step's data as a list",
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query step, an Input Form, or a webhook's own query string/POST body, same as Table. Chain a Card into it to control how each item looks.",
    }),
};

export default listViewStep;
