import type { IModuleNode, IModuleEdge } from "./models/Module";
import { NODE_EXECUTORS } from "./nodes";
import { MAX_NODES, uniqueIncomingSources, type NodeContext, type WebhookTrigger, type ModuleResult } from "./nodes/types";

export type { WebhookTrigger, ModuleResult };

// Finds the trigger node (if any) that should handle an incoming request to
// /<path> (see middleware.ts, which resolves it before the page router
// ever sees the request). Delegates to each node type's own
// `matchesTrigger` — this function doesn't know (or need to know) which
// types are trigger-capable.
export function findWebhookNode(nodes: IModuleNode[], path: string, method: string): IModuleNode | undefined {
    return nodes.find((n) => NODE_EXECUTORS[n.type]?.matchesTrigger?.(n, path, method));
}

export async function runModule(
    nodes: IModuleNode[],
    edges: IModuleEdge[],
    startNodeId: string,
    trigger: WebhookTrigger,
    moduleId: string,
    // Set by lib/nodes/call.ts when this run is itself a sub-module
    // started by a Call node — never passed by a real webhook/function
    // trigger, which always starts fresh at depth 0.
    callDepth = 0,
    // Set by lib/nodes/call.ts when the Call node starting this sub-run
    // was itself fed by a View (see ctx.viewOutput in ./nodes/types.ts) —
    // pre-fills ctx.slotBlocks so the called Function's own id already
    // resolves to that View's blocks by the time the Function forwards
    // into whatever View embeds it as a slot. Never passed by a real
    // webhook/function trigger.
    initialSlotBlocks: Record<string, unknown[]> = {},
): Promise<ModuleResult> {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    // The "context between nodes" that lets a page later in the chain read
    // a value an earlier node produced (e.g. what someone typed into an
    // Input Form). Shared by reference all the way down a single chain,
    // and across a fan-out for everything *except* `body` — see
    // `cloneBody`/`forkedCtxFor` below for why `body` specifically gets
    // its own copy per branch instead.
    const ctx: NodeContext = {
        query: trigger.query,
        body: trigger.body,
        moduleId,
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
        heldFields: {},
    };
    let nodesRun = 0;

    // A form submission (see lib/nodes/inputForm.ts / WebhookInputForm.tsx)
    // carries a hidden `__node` field naming the exact Input Form node it
    // was rendered by. Input Form has no path of its own — every node in a
    // Webhook → Input Form → Input Form → ... chain is reached at the same
    // URL — so `__node` is what lets a request resume the run at the right
    // node instead of always restarting from the webhook (which would
    // otherwise re-trigger the *first* form in the chain on every
    // submission, no matter which form was actually on screen). A plain GET
    // (rendering a page, not submitting one) has no `__node` and always
    // starts at `startNodeId` as normal.
    const targetNodeId =
        trigger.method.toUpperCase() !== "GET" && typeof (trigger.body as any)?.__node === "string"
            ? ((trigger.body as any).__node as string)
            : undefined;
    const actualStartNodeId = targetNodeId && nodeById.has(targetNodeId) ? targetNodeId : startNodeId;

    // Deep-clones just the "current data" a node like Match/Limit/Sort/
    // Project reads and reassigns (ctx.body, and ctx.body.documents in
    // particular). Everything else on NodeContext (responseHeaders,
    // setCookies, slotContent, slotBlocks, viewOutput, htmlAttrs,
    // clientStyles, clientScripts) stays intentionally shared across
    // branches — see their field comments in ./nodes/types.ts — this only
    // isolates the one field that downstream nodes filter/replace in
    // place.
    function cloneBody(body: NodeContext["body"]): NodeContext["body"] {
        if (body === null || typeof body !== "object") return body;
        return typeof structuredClone === "function" ? structuredClone(body) : JSON.parse(JSON.stringify(body));
    }

    // Precomputed once for the whole run — the graph itself never changes
    // mid-run, so there's no need to rescan `edges` on every arrival.
    const incomingSources = new Map<string, string[]>(nodes.map((n) => [n.id, uniqueIncomingSources(edges, n.id)]));

    // A node with 2+ distinct incoming sources whose own data opts it into
    // "wait" (`joinMode: "wait"`, set from the inspector — see
    // ModuleEditor's "Multiple inputs" picker) becomes a real join: every
    // branch that reaches it records its own data here, namespaced by
    // which predecessor it arrived from (`{ [sourceNodeId]: body }`), and
    // the node only actually runs once — either the moment every expected
    // predecessor has shown up, or (see JOIN_TIMEOUT_MS below) once it's
    // waited long enough that any still-missing one almost certainly isn't
    // coming, e.g. the untaken side of a Condition. `resolve` is how every
    // branch that reached this same join — not just whichever one
    // triggered the actual run — ends up with that one shared result
    // instead of the node running again for each of them.
    interface JoinState {
        arrived: Map<string, unknown>;
        settled: boolean;
        promise: Promise<ModuleResult | undefined>;
        resolve: (result: ModuleResult | undefined) => void;
        timer: ReturnType<typeof setTimeout>;
    }
    const joinStates = new Map<string, JoinState>();
    const JOIN_TIMEOUT_MS = 5000;

    function settleJoin(nodeId: string, state: JoinState) {
        if (state.settled) return;
        state.settled = true;
        clearTimeout(state.timer);

        const node = nodeById.get(nodeId);
        if (!node || nodesRun >= MAX_NODES) {
            state.resolve(undefined);
            return;
        }
        nodesRun++;
        const merged: Record<string, unknown> = {};
        for (const [src, body] of state.arrived) merged[src] = body;
        executeAndContinue(node, { ...ctx, body: merged }, false).then(state.resolve);
    }

    // Runs one node's executor and, unless it produced a result itself,
    // recurses into whatever it's wired to next.
    //
    // A node can fan out to more than one next node (e.g. one branch saves
    // to the database while a parallel branch renders the response page —
    // or, just as commonly, two branches independently reshape the same
    // upstream List with their own Find/Match/Sort/Limit chain, like a
    // Find→Match→List View next to a sibling Find→List View). Each branch
    // is walked independently and recursively; branches run concurrently
    // via Promise.all. Only one HTTP response can ever be sent, so once
    // every branch has finished, the first one that actually produced a
    // result (not just a side effect) wins.
    async function executeAndContinue(node: IModuleNode, execCtx: NodeContext, isEntry: boolean): Promise<ModuleResult | undefined> {
        const executor = NODE_EXECUTORS[node.type];
        if (!executor) return undefined;

        const outcome = await executor.run({ node, ctx: execCtx, trigger, edges, nodes, isEntry });
        if (outcome.done) return outcome.result;

        // Every node reached from here on is a *chained* node, not the
        // request's own entry point — see NodeExecutor.run's `isEntry` doc
        // in ./nodes/types.ts for why that distinction matters (Input Form
        // chaining depends on it).
        //
        // Real fan-out (more than one next node) gives each branch its own
        // copy of `body`, taken at the moment of the split. Without this,
        // every branch reads and writes the exact same `body` object, so a
        // node like Match filtering documents in one branch would delete
        // them out from under a sibling branch's own List View — a race
        // depending only on which branch happened to run first. A single
        // next node is just this branch continuing its own chain, so it
        // keeps sharing `execCtx` unchanged (no clone needed).
        const forkedCtxFor = (id: string) => (outcome.nextNodeIds.length > 1 ? { ...execCtx, body: cloneBody(execCtx.body) } : execCtx);
        const branchResults = await Promise.all(outcome.nextNodeIds.map((id) => runFrom(id, false, forkedCtxFor(id), node.id)));
        return branchResults.find((r) => r && r.kind !== "empty") ?? branchResults.find((r) => r !== undefined);
    }

    // `fromNodeId` is the node whose edge led here — undefined only for
    // the run's own entry node, which by definition can't be a join.
    async function runFrom(nodeId: string, isEntry: boolean, branchCtx: NodeContext, fromNodeId?: string): Promise<ModuleResult | undefined> {
        if (nodesRun >= MAX_NODES) return undefined; // guards against cycles

        const node = nodeById.get(nodeId);
        if (!node) return undefined;
        if (!NODE_EXECUTORS[node.type]) return undefined;

        const sources = incomingSources.get(nodeId) ?? [];
        const isWaitJoin = fromNodeId !== undefined && sources.length > 1 && String((node.data as any)?.joinMode ?? "continue") === "wait";

        if (!isWaitJoin) {
            nodesRun++;
            return executeAndContinue(node, branchCtx, isEntry);
        }

        // Join: record this branch's contribution, namespaced by the node
        // it arrived from rather than merged flat, so two inputs with the
        // same field name don't clobber each other — a downstream
        // {{field}} template reads a specific one via
        // {{sourceNodeId.field}} (readPath in ./nodes/types.ts already
        // walks dotted paths, so this needs no template-syntax changes).
        let state = joinStates.get(nodeId);
        if (!state) {
            let resolve!: (result: ModuleResult | undefined) => void;
            const promise = new Promise<ModuleResult | undefined>((res) => {
                resolve = res;
            });
            const newState: JoinState = {
                arrived: new Map(),
                settled: false,
                promise,
                resolve,
                timer: setTimeout(() => settleJoin(nodeId, newState), JOIN_TIMEOUT_MS),
            };
            // Never block the process/request from otherwise finishing on
            // its own just because this timer is still pending.
            if (typeof newState.timer.unref === "function") newState.timer.unref();
            state = newState;
            joinStates.set(nodeId, state);
        }
        state.arrived.set(fromNodeId, branchCtx.body);

        // Every branch that reaches a join — whether it's the one that
        // completes the set or one of the others still waiting behind it —
        // ends up awaiting the exact same shared promise, resolved exactly
        // once by settleJoin. That keeps this branch from running the node
        // itself a second time no matter how many predecessors converge
        // here.
        if (state.arrived.size >= sources.length) settleJoin(nodeId, state);
        return state.promise;
    }

    const result = await runFrom(actualStartNodeId, true, ctx);
    const finalResult = result ?? { kind: "empty", status: 204 };
    // Set Header / Set Cookie (see lib/nodes/setHeader.ts,
    // lib/nodes/setCookie.ts) queue onto the shared ctx rather than
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