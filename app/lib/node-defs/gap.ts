import type { ModuleNodeDef } from "./types";

const gapNode: ModuleNodeDef = {
    type: "gap",
    label: "Gap",
    description: "Empty space — connect it into a View to add breathing room between blocks",
    color: "#a8a29e",
    kind: "action",
    // No configurable height field — a Gap is a fixed-size spacer (see
    // lib/nodes/view.ts on the server, which falls back to 48px whenever
    // `data.size` isn't set). Resize by row/span in the View's Layout
    // designer instead, same as any other block.
    fields: [],
    defaultData: () => ({ size: "48" }),
    summarize: () => "Fixed spacing",
};

export default gapNode;
