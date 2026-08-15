import type { ModuleNodeDef } from "./types";
import { buildClassName, type ClassNodeData } from "../tailwindClasses";

// A styling modifier, not a block of its own — it never shows up on a
// page by itself. Connect its output dot onto a Label or a Div (drag
// from this node onto that one, the same gesture as wiring a block into
// a View) and lib-server/nodes/view.ts picks up the Tailwind classes it
// computes and applies them to that element — see findChainedClass and
// resolveClassName there.
//
// Its inspector is entirely custom (see the "class" case in
// ModuleEditor.tsx, right next to View's own custom "Layout" section)
// because the *set* of fields worth showing depends on what this node is
// wired into: a Label wants text size/weight/color, a Div wants
// flex/spacing/color. `fields` stays empty here on purpose — nothing
// generic to show before the editor knows what's on the other end of the
// wire.
const classNode: ModuleNodeDef = {
    type: "class",
    label: "Class",
    description: "Apply Tailwind styling to whatever it's connected to — shows different options for a Label vs. a Div",
    color: "#db2777",
    kind: "action",
    fields: [],
    defaultData: () => ({}),
    summarize: (data) => {
        const className = buildClassName(data as ClassNodeData);
        return className || "No styles set";
    },
};

export default classNode;
