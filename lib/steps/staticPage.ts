import { renderTemplate, type StepExecutor } from "./types";

const staticPageStep: StepExecutor = {
    run({ node, ctx }) {
        const template = String(node.data?.html ?? `<h1>${node.data?.title ?? "Page"}</h1>`);
        return { done: true, result: { kind: "html", status: 200, html: renderTemplate(template, ctx) } };
    },
};

export default staticPageStep;