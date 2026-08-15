import type { IModuleNode } from "../models/Module";
import { nextEdgeTargets, renderTemplate, type NodeContext, type NodeExecutor } from "./types";

async function runHttpRequest(node: IModuleNode, ctx: NodeContext) {
    const { url = "", method = "GET", headers: headersText = "", body: bodyText = "" } = node.data ?? {};
    const resolvedUrl = renderTemplate(String(url), ctx);
    if (!resolvedUrl) return { ok: false, error: "This node has no URL configured" };

    let headers: Record<string, string> = {};
    if (headersText) {
        try {
            headers = JSON.parse(renderTemplate(String(headersText), ctx));
        } catch {
            // Malformed JSON in the headers field — send the request without
            // them rather than failing the whole run over a typo.
        }
    }

    try {
        const res = await fetch(resolvedUrl, {
            method,
            headers,
            body: method === "GET" || method === "HEAD" ? undefined : renderTemplate(String(bodyText), ctx) || undefined,
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

const httpRequestNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const result = await runHttpRequest(node, ctx);
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length === 0) {
            return { done: true, result: { kind: "json", status: result.ok === false ? 502 : 200, data: result } };
        }
        return { done: false, nextNodeIds };
    },
};

export default httpRequestNode;