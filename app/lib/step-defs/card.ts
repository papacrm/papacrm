import type { WorkflowNodeDef } from "./types";

// Card has a real output dot (kind "action", not "terminal") so it's
// chainable, same idea as View — see lib/steps/view.ts's long comment on
// View's own kind. Where you chain it decides what it means:
//   - into a View (drag onto that node, same as Table/Menu/etc.) — Card
//     embeds as a grid-of-cards block, one card per row of data.
//   - into a List View — Card hands over its title/subtitle/body
//     templates to be used as that step's per-item layout instead of a
//     plain field dump. See lib/steps/listView.ts (resolveListItems) and
//     lib/steps/card.ts (resolveCardItems) on the server.
//   - nowhere — Card renders its own page, one card per row, same as
//     Table renders its own page of rows when nothing's downstream.
const cardStep: WorkflowNodeDef = {
    type: "card",
    label: "Card",
    description: "Shows the previous step's data as cards — chain it into a View to embed a card grid, or into a List View to use it as that list's item template",
    color: "#be185d",
    kind: "action",
    fields: [
        { key: "title", label: "Title (used when Card renders its own page)", kind: "text", placeholder: "Recent submissions" },
        { key: "cardTitle", label: "Card title — use {{field}} for a row's own data", kind: "text", placeholder: "{{name}}" },
        { key: "cardSubtitle", label: "Card subtitle — use {{field}} for a row's own data", kind: "text", placeholder: "{{email}}" },
        {
            key: "cardBody",
            label: "Card body — use {{field}} for a row's own data",
            kind: "textarea",
            placeholder: "{{message}}",
        },
    ],
    defaultData: () => ({ title: "Records", cardTitle: "{{name}}", cardSubtitle: "", cardBody: "" }),
    summarize: (data) => (data?.cardTitle ? `Card: ${data.cardTitle}` : "No card title set"),
    inspectorNote: () => ({
        label: "Tip",
        value: "Feed this from a Query step, an Input Form, or a webhook's own query string/POST body, same as Table — each row becomes one card.",
    }),
};

export default cardStep;
