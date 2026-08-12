import type { WorkflowNodeDef } from "./types";

const htmlStep: WorkflowNodeDef = {
    type: "html",
    label: "Html",
    description: "Sets the <html> tag's lang and/or class for the page this run renders",
    color: "#0f766e",
    kind: "action",
    fields: [
        {
            key: "lang",
            label: "Lang — use {{field}} for data from an earlier step",
            kind: "text",
            placeholder: "en",
        },
        {
            key: "className",
            label: "Class — use {{field}} for data from an earlier step",
            kind: "text",
            placeholder: "dark",
        },
    ],
    defaultData: () => ({ lang: "", className: "" }),
    summarize: (data) => {
        const parts = [data?.lang ? `lang=${data.lang}` : null, data?.className ? `class=${data.className}` : null].filter(Boolean);
        return parts.length ? parts.join(", ") : "No lang/class set";
    },
};

export default htmlStep;
