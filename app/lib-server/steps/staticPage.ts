import { renderTemplate, type StepExecutor } from "./types";

const staticPageStep: StepExecutor = {
    run({ node, ctx }) {
        const title = String(node.data?.title ?? "Page");
        const template = String(node.data?.html ?? `<h1>${title}</h1>`);
        return {
            done: true,
            result: {
                kind: "page",
                status: 200,
                page: {
                    title,
                    component: "staticPage",
                    // renderTemplate only substitutes `{{ field }}` placeholders —
                    // the surrounding markup is still whatever HTML the user typed
                    // into the editor, so the component that renders this (see
                    // app/components/webhooks/StaticPage.tsx) has to render it as
                    // raw HTML, not escape it like a normal prop.
                    props: { html: renderTemplate(template, ctx) },
                },
            },
        };
    },
};

export default staticPageStep;