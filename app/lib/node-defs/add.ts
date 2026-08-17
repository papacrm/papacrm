import type { ModuleNodeDef } from "./types";

const addNode: ModuleNodeDef = {
    type: "add",
    label: "Add",
    description:
        'Sums numbers together and saves the result. Wire in more than one node and set "Multiple inputs" to "Wait" in the inspector to add every input\'s number as one total — see the inspector for exactly how each input is read.',
    color: "#65a30d",
    kind: "action",
    fields: [
        { key: "field", label: "Field to sum (optional — leave blank to use the value itself)", kind: "text", placeholder: "amount" },
        { key: "as", label: "Save as (used later as {{field}})", kind: "text", placeholder: "sum" },
    ],
    defaultData: () => ({ field: "", as: "sum" }),
    summarize: (data) => (data?.as ? `Add${data?.field ? ` ${data.field}` : ""} → ${data.as}` : "No field name set"),
};

export default addNode;
