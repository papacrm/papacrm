import type { StepExecutor } from "./types";

const staticPageStep: StepExecutor = {
    run({ node }) {
        const html = String(node.data?.html ?? `<h1>${node.data?.title ?? "Page"}</h1>`);
        return { done: true, result: { kind: "html", status: 200, html } };
    },
};

export default staticPageStep;
