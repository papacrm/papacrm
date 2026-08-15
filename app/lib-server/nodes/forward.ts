import { loadSiblingModule } from "./submodule";
import type { NodeExecutor } from "./types";

const forwardNode: NodeExecutor = {
    async run({ node, ctx }) {
        const moduleId = String(node.data?.moduleId ?? "").trim();
        const webhookNodeId = String(node.data?.webhookNodeId ?? "").trim();
        if (!moduleId || !webhookNodeId) {
            return { done: true, result: { kind: "json", status: 400, data: { error: "This node has no webhook selected" } } };
        }

        const target = await loadSiblingModule(moduleId, ctx.moduleId);
        const entry = target ? (target.nodes ?? []).find((n: any) => n.id === webhookNodeId && n.type === "webhook") : null;
        if (!target || !entry) {
            return { done: true, result: { kind: "json", status: 400, data: { error: "That webhook node no longer exists" } } };
        }

        // Unlike Call/Route, this never runs anything in-process — it just
        // tells the actual HTTP client (browser, curl, whatever hit this
        // webhook) to go request the other one itself, via a real 3xx
        // redirect. Permanent (301) vs. temporary (302) only affects how
        // the client/caches treat the redirect, not this node's behavior.
        const status = node.data?.mode === "permanent" ? 301 : 302;
        const path = String(entry.data?.path ?? "");
        return { done: true, result: { kind: "empty", status, headers: { Location: `/${path}` } } };
    },
};

export default forwardNode;
