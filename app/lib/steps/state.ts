import type { WorkflowNodeDef } from "./types";

// Stores data from the previous step into a NukeJS store
// (https://nukejs.com/docs/state-management) in the visitor's browser,
// using the given mapping — {"storeKey": "{{field}}"} — to pull values out
// of whatever's in context so far. The resolved values are also added to the
// workflow context, making them available to subsequent steps (e.g., a page
// can access these values via {{storeKey}} template syntax).
//
// When State chains directly to a View (State → View), the View automatically
// displays the state values as formatted JSON at the top of the page for
// debugging.
//
// "Persisted" chooses which of NukeJS's two store constructors this
// mirrors: Yes syncs to localStorage under the same `nuke-store:{name}` key
// createPersistedStore uses (survives page refreshes); No writes straight
// into window.__nukeStores the way createStore does (cleared on refresh).
// Either way, a real createStore/createPersistedStore + useStore()
// elsewhere in the app reads back whatever this step wrote.
const stateStep: WorkflowNodeDef = {
    type: "state",
    label: "State",
    description:
        "Stores data into a NukeJS store and makes it available to subsequent steps. When chained to a View, auto-displays values as JSON.",
    color: "#7c3aed",
    kind: "action",
    fields: [
        { key: "store", label: "Store name", kind: "text", placeholder: "settings" },
        {
            key: "persisted",
            label: "Persisted",
            kind: "select",
            options: [
                { value: "true", label: "Yes — survives page refresh (localStorage)" },
                { value: "false", label: "No — cleared on refresh (memory only)" },
            ],
        },
        {
            key: "mapping",
            label: 'Mapping (JSON) — {"storeKey": "{{field}}"}',
            kind: "textarea",
            placeholder: '{"theme": "{{theme}}"}',
        },
    ],
    defaultData: () => ({ store: "", persisted: "true", mapping: JSON.stringify({ key: "{{field}}" }, null, 2) }),
    summarize: (data) => {
        if (!data?.store) return "No store set";
        const persisted = String(data?.persisted ?? "true") !== "false";
        try {
            const keys = Object.keys(JSON.parse(data?.mapping ?? "{}"));
            const suffix = persisted ? "" : " (memory only)";
            return keys.length ? `${data.store}: ${keys.join(", ")}${suffix}` : `${data.store} (no fields mapped)`;
        } catch {
            return `${data.store} (invalid mapping JSON)`;
        }
    },
};

export default stateStep;
