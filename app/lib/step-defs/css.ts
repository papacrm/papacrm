import type { WorkflowNodeDef } from "./types";

const cssStep: WorkflowNodeDef = {
    type: "css",
    label: "Load CSS",
    description: "Injects CSS from a text block into the page's <head> as a <style> tag",
    color: "#0e7490",
    kind: "action",
    fields: [
        {
            key: "css",
            label: "CSS — use {{field}} for data from an earlier step",
            kind: "textarea",
            placeholder: "body {\n  background: #111;\n  color: #eee;\n}",
        },
    ],
    defaultData: () => ({ css: "" }),
    summarize: (data) => (data?.css ? `${String(data.css).length} chars` : "No CSS set"),
};

export default cssStep;
