import type { IWorkflowNode } from "../models/Workflow";
import { loadListTableData } from "./listData";
import { nextEdgeTargets, renderTemplate, type StepContext, type StepExecutor } from "./types";

// A Container's `blocks` field is a hand-written JSON array. Each entry
// becomes one section of the rendered page, in order:
//   { "type": "table", "listId": "...", "heading": "..." }
//   { "type": "form",  "fields": [...], "submitLabel": "...", "heading": "..." }
//   { "type": "html",  "html": "...", "heading": "..." }
// Unrecognised/malformed entries are dropped rather than failing the page.
function parseBlocks(node: IWorkflowNode): Record<string, any>[] {
    try {
        const parsed = JSON.parse(node.data?.blocks ?? "[]");
        return Array.isArray(parsed) ? parsed.filter((b) => b && typeof b === "object") : [];
    } catch {
        return [];
    }
}

async function resolveBlock(block: Record<string, any>, node: IWorkflowNode, ctx: StepContext) {
    if (block.type === "table") {
        const { fields, documents } = await loadListTableData(String(block.listId ?? "").trim(), ctx.workflowId);
        return { type: "table", heading: block.heading, fields, documents };
    }

    if (block.type === "form") {
        return {
            type: "form",
            heading: block.heading,
            title: block.title,
            submitLabel: String(block.submitLabel ?? "Submit"),
            fields: Array.isArray(block.fields) ? block.fields : [],
            // Same purpose as Input Form's own stepId: lets the engine tell
            // this Container's own form submission apart from any other
            // request to the same URL. See the isSubmission check below and
            // WebhookInputForm.tsx, which this block's form reuses as-is.
            stepId: node.id,
        };
    }

    return { type: "html", heading: block.heading, html: renderTemplate(String(block.html ?? ""), ctx) };
}

const containerStep: StepExecutor = {
    async run({ node, ctx, trigger, edges, isEntry }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Mirrors Input Form's own-submission detection exactly (see
        // lib/steps/inputForm.ts for the full reasoning): a Container has
        // no path of its own either, so a direct non-GET hit is the Form
        // block inside it posting back — fold the submission into ctx.body
        // and move on down the chain instead of re-rendering the page.
        const isSubmission = isEntry && trigger.method.toUpperCase() !== "GET";
        if (isSubmission) {
            ctx.body = trigger.body ?? ctx.body;
            return { done: false, nextNodeIds };
        }

        const title = String(node.data?.title ?? "Page");
        const blocks = await Promise.all(parseBlocks(node).map((block) => resolveBlock(block, node, ctx)));

        return {
            done: true,
            result: {
                kind: "page",
                status: 200,
                page: { title, component: "container", props: { title, blocks } },
            },
        };
    },
};

export default containerStep;