import { connectDB } from "../mongoose";
import Workflow from "../models/Workflow";
import { MAX_CALL_DEPTH, nextEdgeTargets, type StepContext, type StepExecutor, type WorkflowResult } from "./types";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Turns a sub-workflow's WorkflowResult back into plain data so it can be
// folded into ctx.body for whatever's wired up after this Call step — the
// same shape HTTP Request hands the next step (see httpRequest.ts), just
// sourced from an in-process run instead of a fetch() response.
function resultToBody(result: WorkflowResult): any {
    if (result.kind === "json") return result.data;
    if (result.kind === "page") return { title: result.page.title, ...result.page.props };
    return {};
}

async function runCall(node: any, ctx: StepContext): Promise<{ ok: true; result: WorkflowResult } | { ok: false; error: string }> {
    const targetId = String(node.data?.workflowId ?? "").trim();
    if (!OBJECT_ID_RE.test(targetId)) {
        return { ok: false, error: "This step has no workflow selected" };
    }

    if (ctx.callDepth >= MAX_CALL_DEPTH) {
        // A workflow calling itself (directly or through a longer chain of
        // Call steps) would otherwise recurse forever.
        return { ok: false, error: "Too many nested workflow calls" };
    }

    await connectDB();
    const [target, current] = await Promise.all([Workflow.findById(targetId).lean(), Workflow.findById(ctx.workflowId).select("owner").lean()]);

    if (!target || !current || String((target as any).owner) !== String((current as any).owner)) {
        return { ok: false, error: "Workflow not found" };
    }

    const entry = ((target as any).nodes ?? []).find((n: any) => n.type === "function");
    if (!entry) {
        return { ok: false, error: "That workflow has no Function step to call" };
    }

    // Imported lazily to avoid a circular import at module-load time —
    // workflowEngine.ts imports lib/steps (this folder) to build
    // STEP_EXECUTORS, and this step needs to call back into it.
    const { runWorkflow } = await import("../workflowEngine");
    const result = await runWorkflow(
        (target as any).nodes ?? [],
        (target as any).edges ?? [],
        entry.id,
        // A Call step's sub-run has no real HTTP request behind it — no
        // path to match [param]s against, no incoming headers or cookies
        // to read via Get Header / Get Cookie.
        { method: "POST", path: "", query: ctx.query, body: ctx.body, headers: {}, cookies: {} },
        targetId,
        ctx.callDepth + 1,
    );
    return { ok: true, result };
}

const callStep: StepExecutor = {
    async run({ node, ctx, edges }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        const outcome = await runCall(node, ctx);

        if (!outcome.ok) {
            if (nextNodeIds.length === 0) {
                return { done: true, result: { kind: "json", status: 400, data: { error: outcome.error } } };
            }
            // A side-effect-only chain (nothing wired to read the error) —
            // don't fail the whole run over a misconfigured step, same
            // philosophy as HTTP Request's malformed-headers handling.
            return { done: false, nextNodeIds };
        }

        // Chain semantics: if this Call step has a step after it, the
        // called workflow's result is handed to that step (as ctx.body),
        // not sent back as this request's own response. If nothing's wired
        // up next, the called workflow's result *is* this request's result.
        if (nextNodeIds.length === 0) {
            return { done: true, result: outcome.result };
        }

        ctx.body = resultToBody(outcome.result);
        return { done: false, nextNodeIds };
    },
};

export default callStep;
