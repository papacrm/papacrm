import { loadSiblingWorkflow, resultToBody } from "./subworkflow";
import { MAX_CALL_DEPTH, nextEdgeTargets, type StepContext, type StepExecutor, type WorkflowResult } from "./types";

async function runRoute(node: any, ctx: StepContext): Promise<{ ok: true; result: WorkflowResult } | { ok: false; error: string }> {
    const workflowId = String(node.data?.workflowId ?? "").trim();
    const webhookNodeId = String(node.data?.webhookNodeId ?? "").trim();
    if (!workflowId || !webhookNodeId) {
        return { ok: false, error: "This step has no webhook selected" };
    }

    if (ctx.callDepth >= MAX_CALL_DEPTH) {
        // A chain of Route/Call steps that eventually loops back on itself
        // would otherwise recurse forever.
        return { ok: false, error: "Too many nested workflow calls" };
    }

    const target = await loadSiblingWorkflow(workflowId, ctx.workflowId);
    if (!target) return { ok: false, error: "Workflow not found" };

    const entry = (target.nodes ?? []).find((n: any) => n.id === webhookNodeId && n.type === "webhook");
    if (!entry) {
        return { ok: false, error: "That webhook step no longer exists" };
    }

    // Imported lazily to avoid a circular import at module-load time —
    // workflowEngine.ts imports lib/steps (this folder) to build
    // STEP_EXECUTORS, and this step needs to call back into it.
    const { runWorkflow } = await import("../workflowEngine");
    const result = await runWorkflow(
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

const routeStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        const outcome = await runRoute(node, ctx);

        if (!outcome.ok) {
            if (nextNodeIds.length === 0) {
                return { done: true, result: { kind: "json", status: 400, data: { error: outcome.error } } };
            }
            // A side-effect-only chain (nothing wired to read the error) —
            // don't fail the whole run over a misconfigured step.
            return { done: false, nextNodeIds };
        }

        // Same chain semantics as Call: a step wired up after this one
        // receives the routed workflow's result as its body; otherwise
        // that result is returned directly.
        if (nextNodeIds.length === 0) {
            return { done: true, result: outcome.result };
        }

        ctx.body = resultToBody(outcome.result);
        return { done: false, nextNodeIds };
    },
};

export default routeStep;
