import { loadSiblingModule, resultToBody } from "./submodule";
import { MAX_CALL_DEPTH, nextEdgeTargets, type NodeContext, type NodeExecutor, type ModuleResult } from "./types";

async function runRoute(node: any, ctx: NodeContext): Promise<{ ok: true; result: ModuleResult } | { ok: false; error: string }> {
    const moduleId = String(node.data?.moduleId ?? "").trim();
    const webhookNodeId = String(node.data?.webhookNodeId ?? "").trim();
    if (!moduleId || !webhookNodeId) {
        return { ok: false, error: "This node has no webhook selected" };
    }

    if (ctx.callDepth >= MAX_CALL_DEPTH) {
        // A chain of Route/Call nodes that eventually loops back on itself
        // would otherwise recurse forever.
        return { ok: false, error: "Too many nested module calls" };
    }

    const target = await loadSiblingModule(moduleId, ctx.moduleId);
    if (!target) return { ok: false, error: "Module not found" };

    const entry = (target.nodes ?? []).find((n: any) => n.id === webhookNodeId && n.type === "webhook");
    if (!entry) {
        return { ok: false, error: "That webhook node no longer exists" };
    }

    // Imported lazily to avoid a circular import at module-load time —
    // moduleEngine.ts imports lib/nodes (this folder) to build
    // NODE_EXECUTORS, and this node needs to call back into it.
    const { runModule } = await import("../moduleEngine");
    const result = await runModule(
        target.nodes ?? [],
        target.edges ?? [],
        entry.id,
        // Routed in-process, same as Call — the target's own Webhook path
        // is passed through so [param] segments still resolve, but there's
        // no real headers/cookies behind this run.
        { method: "POST", path: String(entry.data?.path ?? ""), query: ctx.query, body: ctx.body, headers: {}, cookies: {} },
        String(target._id),
        ctx.callDepth + 1,
    );
    return { ok: true, result };
}

const routeNode: NodeExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        const outcome = await runRoute(node, ctx);

        if (!outcome.ok) {
            if (nextNodeIds.length === 0) {
                return { done: true, result: { kind: "json", status: 400, data: { error: outcome.error } } };
            }
            // A side-effect-only chain (nothing wired to read the error) —
            // don't fail the whole run over a misconfigured node.
            return { done: false, nextNodeIds };
        }

        // Same chain semantics as Call: a node wired up after this one
        // receives the routed module's result as its body; otherwise
        // that result is returned directly.
        if (nextNodeIds.length === 0) {
            return { done: true, result: outcome.result };
        }

        ctx.body = resultToBody(outcome.result);
        return { done: false, nextNodeIds };
    },
};

export default routeNode;
