import type { WorkflowNodeDef } from "./types";

// A State node has one input handle like any other action, but reads it
// two different ways depending on which side of the node, on the canvas,
// the wire feeding it comes from:
//   - a node positioned to the State node's LEFT (the normal, left-to-right
//     chain direction) → STORE: the mapping's values are read from the
//     current step data and written into the browser's persisted store.
//   - a node positioned to the State node's RIGHT (the wire loops back)
//     → RETRIEVE: the mapping's values are read back out of the store and
//     written onto the page.
// See lib/steps/state.ts for exactly how that's decided (by comparing x
// positions), and https://nukejs.com/docs/state-management for
// createPersistedStore itself, which this piggybacks on (same
// `nuke-store:{name}` localStorage key), so the same store also works
// with a real `useStore()`-based "use client" component elsewhere in the
// app.
const stateStep: WorkflowNodeDef = {
    type: "state",
    label: "State",
    description:
        "Reads/writes a NukeJS persisted store (createPersistedStore) in the visitor's browser. Wire a step in from the LEFT to store its data; wire one in from the RIGHT to retrieve stored data back onto the page.",
    color: "#7c3aed",
    kind: "action",
    fields: [
        { key: "store", label: "Store name", kind: "text", placeholder: "settings" },
        {
            key: "mapping",
            label: "Mapping (JSON) — storing: {\"storeKey\": \"{{field}}\"}. retrieving: {\"storeKey\": \"targetName\"}",
            kind: "textarea",
            placeholder: '{"theme": "{{theme}}"}',
        },
    ],
    defaultData: () => ({ store: "", mapping: JSON.stringify({ key: "{{field}}" }, null, 2) }),
    summarize: (data) => {
        if (!data?.store) return "No store set";
        try {
            const keys = Object.keys(JSON.parse(data?.mapping ?? "{}"));
            return keys.length ? `${data.store}: ${keys.join(", ")}` : `${data.store} (no fields mapped)`;
        } catch {
            return `${data.store} (invalid mapping JSON)`;
        }
    },
};

export default stateStep;
