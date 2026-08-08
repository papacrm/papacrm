import type { IWorkflowNode } from "../models/Workflow";
import { matchesPath, nextEdgeTarget, type StepExecutor } from "./types";

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderInputFormHtml(node: IWorkflowNode): string {
    const title = String(node.data?.title ?? "Form");
    const submitLabel = String(node.data?.submitLabel ?? "Submit");
    let fields: { name: string; label?: string; type?: string }[] = [];
    try {
        const parsed = JSON.parse(node.data?.fields ?? "[]");
        if (Array.isArray(parsed)) fields = parsed;
    } catch {
        // Malformed JSON in the fields config — render the form with no
        // fields rather than failing the whole request.
    }

    const inputs = fields
        .map((f) => {
            const name = escapeHtml(String(f.name ?? ""));
            const label = escapeHtml(String(f.label ?? f.name ?? ""));
            const type = escapeHtml(String(f.type ?? "text"));
            return `<label style="display:block;margin-bottom:12px;">${label}<br/><input name="${name}" type="${type}" style="width:100%;padding:8px;margin-top:4px;box-sizing:border-box;"/></label>`;
        })
        .join("\n");

    return `<!doctype html>
<html>
<head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;">
<h1>${escapeHtml(title)}</h1>
<form method="POST">
${inputs}
<button type="submit" style="padding:8px 16px;">${escapeHtml(submitLabel)}</button>
</form>
</body>
</html>`;
}

const inputFormStep: StepExecutor = {
    run({ node, ctx, trigger, edges }) {
        if (trigger.method.toUpperCase() === "GET") {
            return { done: true, result: { kind: "html", status: 200, html: renderInputFormHtml(node) } };
        }
        // Any non-GET hit is treated as the form submission: fold the
        // submitted fields into the context body and carry on down the
        // chain, same as a webhook trigger firing.
        ctx.body = trigger.body ?? ctx.body;
        return { done: false, nextNodeId: nextEdgeTarget(node, edges) };
    },
    // Responds to any method on its path — GET renders the form, everything
    // else is a submission (see run() above).
    matchesTrigger(node, path) {
        return matchesPath(node, path);
    },
};

export default inputFormStep;
