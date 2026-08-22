import type { IModuleNode } from "../models/Module";
import { nextEdgeTargets, type NodeExecutor } from "./types";

export interface InputFormField {
    name: string;
    label?: string;
    type?: string;
    required?: boolean;
}

export function parseFields(node: IModuleNode): InputFormField[] {
    try {
        const parsed = JSON.parse(node.data?.fields ?? "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Malformed JSON in the fields config — render the form with no
        // fields rather than failing the whole request.
        return [];
    }
}

const inputFormNode: NodeExecutor = {
    run({ node, ctx, trigger, edges, isEntry }) {
        // Input Form has no path of its own — every node in a Webhook →
        // Input Form → Input Form chain is reached at the same URL. What
        // makes `isEntry` true for *this specific* node on a submission is
        // moduleEngine.ts resolving the request's hidden `__node` field
        // (see the WebhookInputForm.tsx `<input type="hidden" name="__node">`
        // below) to this node and starting the run there directly, instead
        // of at the webhook. So: a direct hit (isEntry) that's a non-GET is
        // this form's own submission; anything else (isEntry but GET, or
        // reached mid-chain by following an edge) means the person needs to
        // see this node's own form next.
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
                        // bar — but it does carry `nodeId` (this node's own
                        // id) in a hidden field so the engine can tell this
                        // form's submission apart from any other form's, all
                        // sharing that one URL. See runModule in
                        // ../moduleEngine.ts.
                        props: {
                            title,
                            submitLabel: String(node.data?.submitLabel ?? "Submit"),
                            fields: parseFields(node),
                            nodeId: node.id,
                            // Everything collected so far this chain (see
                            // decodeCarry's doc in ./types.ts), so this
                            // form's own submission can hand it back and
                            // a later step's data edge from an earlier
                            // form still has something to read.
                            carry: JSON.stringify(ctx.nodeOutputs),
                        },
                    },
                },
            };
        }
        // This form's own submission: fold its declared fields into the
        // context body and carry on down the chain, same as a webhook
        // trigger firing. Deliberately builds a fresh object from just
        // this form's own field names rather than assigning trigger.body
        // wholesale — trigger.body is the raw POST, which also carries the
        // hidden "__node" field (see the isEntry doc above and
        // WebhookInputForm.tsx's hidden input) used only to route this
        // submission to this node. That's routing plumbing, not form data:
        // if it leaked through onto ctx.body, it would also become this
        // node's recorded ctx.nodeOutputs entry (see moduleEngine.ts),
        // and from there get merged onto anything wired to this node via a
        // "data" edge — e.g. a Match node reading {{email}} would
        // silently also pick up a stray "__node" field alongside it.
        const fields = parseFields(node);
        const rawBody = (trigger.body ?? {}) as Record<string, unknown>;
        const submitted: Record<string, unknown> = {};
        for (const field of fields) {
            if (field.name) submitted[field.name] = rawBody[field.name];
        }
        ctx.body = submitted;
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default inputFormNode;