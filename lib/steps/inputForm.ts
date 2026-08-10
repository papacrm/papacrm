import type { IWorkflowNode } from "../models/Workflow";
import { matchesPath, nextEdgeTargets, type StepExecutor } from "./types";

export interface InputFormField {
    name: string;
    label?: string;
    type?: string;
    required?: boolean;
}

function parseFields(node: IWorkflowNode): InputFormField[] {
    try {
        const parsed = JSON.parse(node.data?.fields ?? "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Malformed JSON in the fields config — render the form with no
        // fields rather than failing the whole request.
        return [];
    }
}

const inputFormStep: StepExecutor = {
    run({ node, ctx, trigger, edges, isEntry }) {
        // Only a direct request to *this* node's own path+method is a
        // submission of *this* form. Every other way of reaching this node
        // — the actual entry request being a GET, or this node being
        // reached mid-chain from a previous step (another Input Form's
        // submission, a webhook, ...) — means the person needs to see this
        // step's own form next, not have it silently skipped.
        //
        // This is what makes Input Form → Input Form (→ anything) chains
        // work: submitting form A lands on form B's *render*, not form B's
        // *submit* handler, even though the whole run started from a POST.
        const isSubmission = isEntry && trigger.method.toUpperCase() !== "GET";

        if (!isSubmission) {
            const title = String(node.data?.title ?? "Form");
            return {
                done: true,
                result: {
                    kind: "page",
                    status: 200,
                    page: {
                        title,
                        component: "inputForm",
                        // The form itself — including its client-side
                        // reactivity (live validation, disabled/loading submit
                        // state) — is rendered by
                        // app/components/webhooks/WebhookInputForm.tsx.
                        props: {
                            title,
                            submitLabel: String(node.data?.submitLabel ?? "Submit"),
                            fields: parseFields(node),
                            // This node's own webhook path — not necessarily
                            // the path the current request came in on. When
                            // this form is reached mid-chain (see isEntry
                            // above) it's swapped into a page that's still
                            // showing a *different* node's URL in the address
                            // bar, so the form needs to know explicitly where
                            // it lives in order to submit to (and let the
                            // browser navigate to) the right place. See
                            // WebhookInputForm.tsx.
                            path: String(node.data?.path ?? "").replace(/^\/+/, ""),
                        },
                    },
                },
            };
        }
        // Any non-GET hit on this node's own path is treated as the form
        // submission: fold the submitted fields into the context body and
        // carry on down the chain, same as a webhook trigger firing.
        ctx.body = trigger.body ?? ctx.body;
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
    // Responds to any method on its path — GET renders the form, everything
    // else is a submission (see run() above).
    matchesTrigger(node, path) {
        return matchesPath(node, path);
    },
};

export default inputFormStep;