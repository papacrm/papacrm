import type { IWorkflowNode } from "../models/Workflow";
import { nextEdgeTargets, type StepExecutor } from "./types";

export interface InputFormField {
    name: string;
    label?: string;
    type?: string;
    required?: boolean;
}

export function parseFields(node: IWorkflowNode): InputFormField[] {
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
        // Input Form has no path of its own — every step in a Webhook →
        // Input Form → Input Form chain is reached at the same URL. What
        // makes `isEntry` true for *this specific* node on a submission is
        // workflowEngine.ts resolving the request's hidden `__step` field
        // (see the WebhookInputForm.tsx `<input type="hidden" name="__step">`
        // below) to this node and starting the run there directly, instead
        // of at the webhook. So: a direct hit (isEntry) that's a non-GET is
        // this form's own submission; anything else (isEntry but GET, or
        // reached mid-chain by following an edge) means the person needs to
        // see this step's own form next.
        //
        // This is what makes Input Form → Input Form (→ anything) chains
        // work: submitting form A resumes exactly at A, folds its fields
        // in, and moves on to B's *render* — not A's render again, and not
        // B's submit handler.
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
                        // app/components/webhooks/WebhookInputForm.tsx. It has
                        // no path to submit to — it just posts back to
                        // whatever URL is already in the browser's address
                        // bar — but it does carry `stepId` (this node's own
                        // id) in a hidden field so the engine can tell this
                        // form's submission apart from any other form's, all
                        // sharing that one URL. See runWorkflow in
                        // ../workflowEngine.ts.
                        props: {
                            title,
                            submitLabel: String(node.data?.submitLabel ?? "Submit"),
                            fields: parseFields(node),
                            stepId: node.id,
                        },
                    },
                },
            };
        }
        // This form's own submission: fold the submitted fields into the
        // context body and carry on down the chain, same as a webhook
        // trigger firing.
        ctx.body = trigger.body ?? ctx.body;
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default inputFormStep;