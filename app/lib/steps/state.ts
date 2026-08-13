import type { WorkflowNodeDef } from "./types";

// Stores data from the previous step into a NukeJS store
// (https://nukejs.com/docs/state-management) in the visitor's browser,
// using the given mapping — {"storeKey": "{{field}}"} — to pull values out
// of whatever's in context so far. This only ever happens client-side —
// there's no server-side session for State to write into, so unlike
// Mapper it never folds its resolved values back into the shared workflow
// context for arbitrary downstream {{templating}}.
//
// What it *does* do is hand its resolved values to whatever step is wired
// directly after it, for that one step to use:
//   - State → View: the View auto-displays the values as formatted JSON at
//     the top of the page, for debugging.
//   - State → (Text/Checkbox/Textarea/Number) Input: that input step shows
//     the mapped value as its own — so wiring that input into a View later
//     renders it pre-filled instead of empty.
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
        "Stores data into a NukeJS store in the visitor's browser (memory or localStorage). Hands its mapped values to a directly-chained View (as JSON) or Input step (as its value).",
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
