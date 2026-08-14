import type { IWorkflowNode, IWorkflowEdge } from "./models/Workflow";
import { STEP_EXECUTORS } from "./steps";
import { MAX_STEPS, type StepContext, type WebhookTrigger, type WorkflowResult } from "./steps/types";

export type { WebhookTrigger, WorkflowResult };

// Finds the trigger node (if any) that should handle an incoming request to
// /<path> (see middleware.ts, which resolves it before the page router
// ever sees the request). Delegates to each node type's own
// `matchesTrigger` — this function doesn't know (or need to know) which
// types are trigger-capable.
export function findWebhookNode(nodes: IWorkflowNode[], path: string, method: string): IWorkflowNode | undefined {
    return nodes.find((n) => STEP_EXECUTORS[n.type]?.matchesTrigger?.(n, path, method));
}

export async function runWorkflow(
    nodes: IWorkflowNode[],
    edges: IWorkflowEdge[],
    startNodeId: string,
    trigger: WebhookTrigger,
    workflowId: string,
    // Set by lib/steps/call.ts when this run is itself a sub-workflow
    // started by a Call step — never passed by a real webhook/function
    // trigger, which always starts fresh at depth 0.
    callDepth = 0,
    // Set by lib/steps/call.ts when the Call step starting this sub-run
    // was itself fed by a View (see ctx.viewOutput in ./steps/types.ts) —
    // pre-fills ctx.slotBlocks so the called Function's own id already
    // resolves to that View's blocks by the time the Function forwards
    // into whatever View embeds it as a slot. Never passed by a real
    // webhook/function trigger.
    initialSlotBlocks: Record<string, unknown[]> = {},
): Promise<WorkflowResult> {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    // The "context between steps" that lets a page later in the chain read
    // a value an earlier step produced (e.g. what someone typed into an
    // Input Form). Shared by reference all the way down a single chain,
    // and across a fan-out for everything *except* `body` — see
    // `cloneBody`/`forkedCtxFor` below for why `body` specifically gets
    // its own copy per branch instead.
    const ctx: StepContext = {
        query: trigger.query,
        body: trigger.body,
        workflowId,
        callDepth,
        responseHeaders: {},
        setCookies: [],
        slotContent: {},
        slotBlocks: { ...initialSlotBlocks },
        viewOutput: {},
        htmlAttrs: {},
        clientStyles: [],
        clientScripts: [],
        stateValues: undefined,
    };
    let stepsRun = 0;

    // A form submission (see lib/steps/inputForm.ts / WebhookInputForm.tsx)
    // carries a hidden `__step` field naming the exact Input Form node it
    // was rendered by. Input Form has no path of its own — every step in a
    // Webhook → Input Form → Input Form → ... chain is reached at the same
    // URL — so `__step` is what lets a request resume the run at the right
    // node instead of always restarting from the webhook (which would
    // otherwise re-trigger the *first* form in the chain on every
    // submission, no matter which form was actually on screen). A plain GET
    // (rendering a page, not submitting one) has no `__step` and always
    // starts at `startNodeId` as normal.
    const targetStepId =
        trigger.method.toUpperCase() !== "GET" && typeof (trigger.body as any)?.__step === "string"
            ? ((trigger.body as any).__step as string)
            : undefined;
    const actualStartNodeId = targetStepId && nodeById.has(targetStepId) ? targetStepId : startNodeId;

    // Deep-clones just the "current data" a step like Match/Limit/Sort/
    // Project reads and reassigns (ctx.body, and ctx.body.documents in
    // particular). Everything else on StepContext (responseHeaders,
    // setCookies, slotContent, slotBlocks, viewOutput, htmlAttrs,
    // clientStyles, clientScripts) stays intentionally shared across
    // branches — see their field comments in ./steps/types.ts — this only
    // isolates the one field that downstream steps filter/replace in
    // place.
    function cloneBody(body: StepContext["body"]): StepContext["body"] {
        if (body === null || typeof body !== "object") return body;
        return typeof structuredClone === "function" ? structuredClone(body) : JSON.parse(JSON.stringify(body));
    }

    // A node can fan out to more than one next node (e.g. one branch saves
    // to the database while a parallel branch renders the response page —
    // or, just as commonly, two branches independently reshape the same
    // upstream List with their own Find/Match/Sort/Limit chain, like a
    // Find→Match→List View next to a sibling Find→List View). Each branch
    // is walked independently and recursively; branches run concurrently
    // via Promise.all. Only one HTTP response can ever be sent, so once
    // every branch has finished, the first one that actually produced a
    // result (not just a side effect) wins.
    async function runFrom(nodeId: string, isEntry: boolean, branchCtx: StepContext): Promise<WorkflowResult | undefined> {
        if (stepsRun >= MAX_STEPS) return undefined; // guards against cycles
        stepsRun++;

        const node = nodeById.get(nodeId);
        if (!node) return undefined;

        const executor = STEP_EXECUTORS[node.type];
        if (!executor) return undefined;

        const outcome = await executor.run({ node, ctx: branchCtx, trigger, edges, nodes, isEntry });
        if (outcome.done) return outcome.result;

        // Every node reached from here on is a *chained* step, not the
        // request's own entry point — see StepExecutor.run's `isEntry` doc
        // in ./steps/types.ts for why that distinction matters (Input Form
        // chaining depends on it).
        //
        // Real fan-out (more than one next node) gives each branch its own
        // copy of `body`, taken at the moment of the split. Without this,
        // every branch reads and writes the exact same `body` object, so a
        // step like Match filtering documents in one branch would delete
        // them out from under a sibling branch's own List View — a race
        // depending only on which branch happened to run first. A single
        // next node is just this branch continuing its own chain, so it
        // keeps sharing `branchCtx` unchanged (no clone needed).
        const forkedCtxFor = (id: string) => (outcome.nextNodeIds.length > 1 ? { ...branchCtx, body: cloneBody(branchCtx.body) } : branchCtx);
        const branchResults = await Promise.all(outcome.nextNodeIds.map((id) => runFrom(id, false, forkedCtxFor(id))));
        return branchResults.find((r) => r && r.kind !== "empty") ?? branchResults.find((r) => r !== undefined);
    }

    const result = await runFrom(actualStartNodeId, true, ctx);
    const finalResult = result ?? { kind: "empty", status: 204 };
    // Set Header / Set Cookie (see lib/steps/setHeader.ts,
    // lib/steps/setCookie.ts) queue onto the shared ctx rather than
    // returning a result themselves, so they work no matter which branch
    // of a fan-out is the one that actually renders — fold whatever they
    // queued onto the response the caller (server/hooks/[...path].ts)
    // will send.
    return {
        ...finalResult,
        headers: Object.keys(ctx.responseHeaders).length ? ctx.responseHeaders : finalResult.headers,
        cookies: ctx.setCookies.length ? ctx.setCookies : finalResult.cookies,
        htmlAttrs: Object.keys(ctx.htmlAttrs).length ? ctx.htmlAttrs : finalResult.htmlAttrs,
        styles: ctx.clientStyles.length ? ctx.clientStyles : finalResult.styles,
        scripts: ctx.clientScripts.length ? ctx.clientScripts : finalResult.scripts,
    };
}