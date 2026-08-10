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
    run({ node, ctx, trigger, edges }) {
        if (trigger.method.toUpperCase() === "GET") {
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
                        },
                    },
                },
            };
        }
        // Any non-GET hit is treated as the form submission: fold the
        // submitted fields into the context body and carry on down the
        // chain, same as a webhook trigger firing.
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