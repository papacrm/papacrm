import type { IWorkflowNode } from "../models/Workflow";
import { nextEdgeTarget, type StepExecutor } from "./types";

async function runHttpRequest(node: IWorkflowNode) {
    const { url = "", method = "GET", headers: headersText = "", body: bodyText = "" } = node.data ?? {};
    if (!url) return { ok: false, error: "This step has no URL configured" };

    let headers: Record<string, string> = {};
    if (headersText) {
        try {
            headers = JSON.parse(headersText);
        } catch {
            // Malformed JSON in the headers field — send the request without
            // them rather than failing the whole run over a typo.
        }
    }

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" ? undefined : bodyText || undefined,
        });
        const text = await res.text();
        let data: unknown = text;
        try {
            data = JSON.parse(text);
        } catch {
            // Not JSON — return the raw text.
        }
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
    }
}

const httpRequestStep: StepExecutor = {
    async run({ node, edges }) {
        const result = await runHttpRequest(node);
        const nextNodeId = nextEdgeTarget(node, edges);
        if (!nextNodeId) {
            return { done: true, result: { kind: "json", status: result.ok === false ? 502 : 200, data: result } };
        }
        return { done: false, nextNodeId };
    },
};

export default httpRequestStep;
