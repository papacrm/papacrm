import Module from "../models/Module";
import { connectDB } from "../mongoose";
import { loadSiblingModule, resultToBody, resultToSlotContent } from "./submodule";
import { MAX_CALL_DEPTH, nextEdgeTargets, type NodeContext, type NodeExecutor, type ModuleResult } from "./types";

async function runCall(
    node: any,
    ctx: NodeContext,
    // This Call node's own resolved blocks, when it's fed directly by a
    // View (see the lookup in callNode.run below) — handed to the called
    // Function's sub-run as its own slot content, keyed by the Function's
    // id, so that if the Function forwards into a View with itself wired
    // in as a slot (a shared layout), that View's content renders there
    // instead of the slot staying empty. undefined when this Call isn't
    // fed by a View — an ordinary function call, unaffected.
    incomingViewBlocks: unknown[] | undefined,
): Promise<{ ok: true; result: ModuleResult } | { ok: false; error: string }> {
    const functionId = String(node.data?.functionId ?? "").trim();
    if (!functionId) {
        return { ok: false, error: "This node has no function selected" };
    }

    if (ctx.callDepth >= MAX_CALL_DEPTH) {
        // A module calling itself (directly or through a longer chain of
        // Call/Route nodes) would otherwise recurse forever.
        return { ok: false, error: "Too many nested module calls" };
    }

    const scope = node.data?.scope === "external" ? "external" : "internal";
    let target: any;

    if (scope === "internal") {
        // "Internal" means a Function node elsewhere in the very module
        // this node lives in — no owner check needed, it's already the
        // module currently running.
        await connectDB();
        target = await Module.findById(ctx.moduleId).lean();
        if (!target) return { ok: false, error: "Module not found" };
    } else {
        const moduleId = String(node.data?.moduleId ?? "").trim();
        target = await loadSiblingModule(moduleId, ctx.moduleId);
        if (!target) return { ok: false, error: "Module not found" };
    }

    const entry = (target.nodes ?? []).find((n: any) => n.id === functionId && n.type === "function");
    if (!entry) {
        return { ok: false, error: "That function no longer exists" };
    }
    if (scope === "external" && entry.data?.visibility !== "public") {
        // The function may have been made private (or the target module
        // re-assigned) after this Call node was wired up — refuse rather
        // than silently reaching into something no longer meant to be
        // shared. Internal calls skip this check: a module can always
        // call its own private functions.
        return { ok: false, error: "That function is private" };
    }

    // Imported lazily to avoid a circular import at module-load time —
    // moduleEngine.ts imports lib/nodes (this folder) to build
    // NODE_EXECUTORS, and this node needs to call back into it.
    const { runModule } = await import("../moduleEngine");
    const result = await runModule(
        target.nodes ?? [],
        target.edges ?? [],
        entry.id,
        // A Call node's sub-run has no real HTTP request behind it — no
        // path to match [param]s against, no incoming headers or cookies
        // to read via Get Header / Get Cookie.
        { method: "POST", path: "", query: ctx.query, body: ctx.body, headers: {}, cookies: {} },
        String(target._id),
        ctx.callDepth + 1,
        incomingViewBlocks ? { [entry.id]: incomingViewBlocks } : {},
    );

    // Record what this call produced, keyed by the Function node's id —
    // if that same Function is wired into a View elsewhere in this run
    // (as an empty "slot" block, see EMBEDDABLE_TYPES in
    // lib/nodes/view.ts), the View fills the slot with this instead of
    // leaving it empty. Harmless if nothing's wired up to read it.
    ctx.slotContent[entry.id] = resultToSlotContent(result);

    return { ok: true, result };
}

const callNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If a View wired its own output straight into this Call node (see
        // lib/nodes/view.ts — it renders itself and stashes the result on
        // ctx.viewOutput rather than answering directly whenever it chains
        // into something other than another View), treat that as "render
        // this View inside whatever layout the called Function belongs
        // to" rather than an ordinary call.
        const incomingViewId = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "view")?.source;
        const incomingViewBlocks = incomingViewId ? ctx.viewOutput[incomingViewId]?.blocks : undefined;

        const outcome = await runCall(node, ctx, incomingViewBlocks);

        if (!outcome.ok) {
            if (nextNodeIds.length === 0) {
                return { done: true, result: { kind: "json", status: 400, data: { error: outcome.error } } };
            }
            // A side-effect-only chain (nothing wired to read the error) —
            // don't fail the whole run over a misconfigured node, same
            // philosophy as HTTP Request's malformed-headers handling.
            return { done: false, nextNodeIds };
        }

        // Chain semantics: if this Call node has a node after it, the
        // called function's result is handed to that node (as ctx.body),
        // not sent back as this request's own response. If nothing's wired
        // up next, the called function's result *is* this request's result.
        if (nextNodeIds.length === 0) {
            return { done: true, result: outcome.result };
        }

        ctx.body = resultToBody(outcome.result);
        return { done: false, nextNodeIds };
    },
};

export default callNode;
