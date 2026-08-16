// Shared contracts for node *execution* (the server-side counterpart of
// app/lib/node-defs). Each node type exports one NodeExecutor here — that's
// the only thing moduleEngine.ts needs to know about it. To add a new
// node's runtime behavior: create `<name>.ts` in this folder and register
// it in `index.ts`.

import type { IModuleNode, IModuleEdge } from "../models/Module";

export interface WebhookTrigger {
    method: string;
    // Raw request path (e.g. "something/abc123"), used to extract [param]
    // segments against the matching webhook node's configured path — see
    // matchPath below and lib/nodes/webhook.ts.
    path: string;
    query: Record<string, string>;
    body: unknown;
    // Incoming request headers, lower-cased keys (Node lower-cases them
    // already, but this keeps lookups predictable regardless of source).
    // Used by Get Header — see lib/nodes/getHeader.ts.
    headers: Record<string, string>;
    // Incoming request cookies, parsed from the Cookie header. Used by Get
    // Cookie — see lib/nodes/getCookie.ts.
    cookies: Record<string, string>;
}

// A node that wants to render a page hands back a *description* of that
// page — which React component to use (looked up in
// app/components/webhooks/registry.tsx) and the props it needs — rather
// than a pre-rendered HTML string. The endpoint (server/hooks/[...path].ts,
// middleware.ts) is what actually turns this into HTML, via NukeJS's
// `renderComponent()`. That keeps node executors framework-agnostic (no
// React, no SSR calls in here) while still getting real NukeJS SSR —
// `useHtml()`, layouts, etc. — for every module-rendered page, plus
// automatic escaping (no more hand-rolled `escapeHtml`).
export type ModulePageComponent = "staticPage" | "inputForm" | "table" | "container" | "view" | "listView" | "card";

export interface ModulePage {
    title: string;
    component: ModulePageComponent;
    props: Record<string, unknown>;
}

// Carried by every ModuleResult variant so a node anywhere in the run
// (Set Header / Set Cookie — see lib/nodes/setHeader.ts and
// lib/nodes/setCookie.ts) can affect the actual HTTP response, no matter
// which branch of a fan-out ends up producing the page/json/empty result.
// Populated from ctx.responseHeaders / ctx.setCookies once the run
// finishes — see runModule in ../moduleEngine.ts.
interface ModuleResultExtras {
    headers?: Record<string, string>;
    cookies?: SetCookieInstruction[];
    // Queued by Html (lib/nodes/html.ts) — applied to the rendered page's
    // <html> element regardless of which node actually produces the page,
    // same reasoning as headers/cookies above.
    htmlAttrs?: { lang?: string; className?: string };
    // Queued by Load CSS (lib/nodes/css.ts) — raw <style> block contents.
    styles?: string[];
    // Queued by Html/Load CSS/State (lib/nodes/state.ts) — raw inline
    // <script> bodies, injected at the end of <body>.
    scripts?: string[];
}

export interface SetCookieInstruction {
    name: string;
    value: string;
    maxAge?: number;
    httpOnly?: boolean;
}

export type ModuleResult =
    | ({ kind: "page"; status: number; page: ModulePage } & ModuleResultExtras)
    | ({ kind: "json"; status: number; data: unknown } & ModuleResultExtras)
    | ({ kind: "text"; status: number; text: string } & ModuleResultExtras)
    | ({ kind: "empty"; status: number } & ModuleResultExtras);

export interface NodeContext {
    query: Record<string, string>;
    // Shared, mutable "current data" for the run — trigger nodes (webhook,
    // inputForm) set this to whatever was submitted; every node downstream
    // (including parallel branches) sees the same object, so a node like
    // Static Page can read a value a person typed into an earlier Input
    // Form node. See `renderTemplate` below for the `{{ field }}` syntax
    // nodes use to pull values out of it.
    body: any;
    // id of the module currently running — nodes that persist data (e.g.
    // Save to Database) need this to know which module a record belongs to.
    moduleId: string;
    // How many "Call" nodes deep this run is nested (0 for a run started by
    // a real webhook/function trigger). Incremented by lib/nodes/call.ts
    // each time it starts a sub-module — see MAX_CALL_DEPTH below.
    callDepth: number;
    // Response headers queued by Set Header nodes (lib/nodes/setHeader.ts),
    // applied to the real HTTP response once the run finishes. Shared
    // across every branch, same as `body`.
    responseHeaders: Record<string, string>;
    // Set-Cookie instructions queued by Set Cookie nodes
    // (lib/nodes/setCookie.ts), applied the same way.
    setCookies: SetCookieInstruction[];
    // Content produced by a Call node (lib/nodes/call.ts), keyed by the
    // called Function node's id. A View that has a Function wired into it
    // (see EMBEDDABLE_TYPES in lib/nodes/view.ts) renders an empty "slot"
    // block for it by default — if that same function was actually called
    // earlier in this run, the slot is filled with whatever's recorded
    // here instead. Shared across branches, same as `body`.
    slotContent: Record<string, string>;
    // Same idea as `slotContent`, but a whole nested block layout instead
    // of plain text — set by lib/nodes/call.ts, right before it starts a
    // sub-run, when the Call node it's running for is itself fed by a
    // View (see `viewOutput` below). Keyed by the called Function node's
    // id, read back in lib/nodes/view.ts's resolveChildren.
    slotBlocks: Record<string, unknown[]>;
    // Queued by Html (lib/nodes/html.ts) — merged shallowly as each Html
    // node runs, so a later Html node overrides an earlier one's lang/
    // className but leaves the other untouched. Folded onto the final
    // ModuleResult the same way responseHeaders/setCookies are — see
    // runModule below.
    htmlAttrs: { lang?: string; className?: string };
    // Queued by Load CSS (lib/nodes/css.ts) — one entry per node run.
    clientStyles: string[];
    // Queued by Load CSS and State (lib/nodes/css.ts, lib/nodes/state.ts)
    // — raw inline <script> bodies, applied the same way.
    clientScripts: string[];
    // A View that chains into something other than another View (e.g. a
    // Call node) renders its own blocks right there instead of just
    // forwarding — see lib/nodes/view.ts — and stashes them here, keyed by
    // its own node id, so a Call node reached right after it (see
    // lib/nodes/call.ts) can pass them along to whatever Function it
    // calls. This is how "View → Call (a layout's Function)" ends up
    // rendering the View's content inside that shared layout instead of
    // as its own page.
    viewOutput: Record<string, { title: string; blocks: unknown[] }>;
    // This request's server-resolved patch from the most recently run
    // State node (see lib/nodes/state.ts), plus that State node's own id.
    // State only ever really stores into the visitor's browser
    // (localStorage / window.__nukeStores) — the server has no way to
    // read that back, so this is *not* the authoritative "current state",
    // just this request's best guess, used for:
    //   - a first-paint fallback so a chained View/Input isn't blank
    //     before JS runs;
    //   - `nodeId`, so the rendered markup can be tagged (e.g. a View's
    //     debug block gets `data-state-debug={nodeId}`) for State's own
    //     client-side hydration script to find and correct with the real,
    //     persisted-aware store contents once the page loads.
    // Not merged into `body` for arbitrary downstream templating — see
    // lib/nodes/state.ts. Overwritten (not merged) each time a State node
    // runs.
    stateValues?: { nodeId: string; data: Record<string, string> };
}

export type NodeOutcome =
    // Ends this branch and sends `result` back as the HTTP response — only
    // wins if no *other* branch of a fan-out also finishes with a result
    // (see runModule in ../moduleEngine.ts for how that's resolved).
    | { done: true; result: ModuleResult }
    // Moves on to every node in `nextNodeIds`, run concurrently. An empty
    // array (e.g. an output handle with nothing wired to it) ends this
    // branch with no result.
    | { done: false; nextNodeIds: string[] };

export interface NodeExecutor {
    run(args: {
        node: IModuleNode;
        ctx: NodeContext;
        trigger: WebhookTrigger;
        edges: IModuleEdge[];
        // Every node in the module, not just this one — needed by View
        // (see lib/nodes/view.ts) to look up the actual data of the
        // page-building blocks (Menu, Tabs, Navbar, Footer, Table, Input
        // Form, nested View) wired into it. Most nodes never touch this.
        nodes: IModuleNode[];
        // True only for the node the run actually starts at — either the
        // webhook node matched by `findWebhookNode`, or (when the request
        // is a form submission — see runModule in ../moduleEngine.ts)
        // the specific Input Form node named by the request's `__node`
        // field. False for every node reached by following an edge from
        // another node. This is what lets Input Form tell "this request is
        // *my* submission" apart from "a previous node just handed control
        // to me" — see lib/nodes/inputForm.ts, which needs that distinction
        // to support Input Form → Input Form chains (an Input Form node
        // reached mid-chain must render its own form, not reinterpret
        // whatever request started the chain as its submission).
        isEntry: boolean;
    }): Promise<NodeOutcome> | NodeOutcome;
    // Only needed by nodes reachable at /<path> (webhook, inputForm, ...).
    // Decides whether this node should handle an incoming request to that
    // path/method. Nodes that are never a module's entry point (like
    // condition or httpRequest) omit this.
    matchesTrigger?(node: IModuleNode, path: string, method: string): boolean;
}

// Guards against accidental cycles in a hand-built graph turning a webhook
// hit into an infinite loop.
export const MAX_NODES = 50;

// Guards against a Call node (see lib/nodes/call.ts) starting a
// sub-module that itself calls another module, and so on — including a
// module calling itself, directly or via a longer cycle. Each nesting
// level still gets its own MAX_NODES budget, so this bounds the *depth* of
// recursion, not the total amount of work.
export const MAX_CALL_DEPTH = 10;

export function matchesPath(node: IModuleNode, path: string): boolean {
    return matchPath(String(node.data?.path ?? ""), path) !== null;
}

// Matches a configured webhook path (which may contain `[param]` segments,
// e.g. "something/[id]") against the actual request path, returning the
// extracted params (e.g. { id: "abc123" }) on a match, or null if the
// segment count or any literal segment doesn't line up. Segment-by-segment
// only — no partial-segment or wildcard matching, same spirit as the
// framework's own [...path] file routing.
export function matchPath(pattern: string, path: string): Record<string, string> | null {
    const clean = (s: string) => s.replace(/^\/+|\/+$/g, "");
    const patternSegs = clean(pattern).split("/").filter(Boolean);
    const pathSegs = clean(path).split("/").filter(Boolean);
    if (patternSegs.length !== pathSegs.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < patternSegs.length; i++) {
        const paramMatch = /^\[(\w+)\]$/.exec(patternSegs[i]);
        if (paramMatch) {
            try {
                params[paramMatch[1]] = decodeURIComponent(pathSegs[i]);
            } catch {
                params[paramMatch[1]] = pathSegs[i];
            }
        } else if (patternSegs[i] !== pathSegs[i]) {
            return null;
        }
    }
    return params;
}

// Follows every outgoing edge from `node` (a node can now fan out to more
// than one next node — e.g. one branch saves to the database while another
// renders the response page). Pass `sourceHandle` for branch-style nodes
// (e.g. "true"/"false"); omit it for single-handle nodes.
export function nextEdgeTargets(node: IModuleNode, edges: IModuleEdge[], sourceHandle?: string): string[] {
    return edges.filter((e) => e.source === node.id && (sourceHandle === undefined || e.sourceHandle === sourceHandle)).map((e) => e.target);
}

// Distinct source nodes with an edge into `nodeId` — a node with 2+ of
// these is a *join*. Shared with moduleEngine.ts (which uses it to decide
// whether a node is a join at all) and with any node executor that needs
// to recognize its own multi-input "wait" join body — see isJoinBody below.
export function uniqueIncomingSources(edges: IModuleEdge[], nodeId: string): string[] {
    return Array.from(new Set(edges.filter((e) => e.target === nodeId).map((e) => e.source)));
}

// When a node has "Multiple inputs" set to Wait, moduleEngine's join (see
// settleJoin in ../moduleEngine.ts) hands it a body namespaced by which
// predecessor it arrived from — `{ [sourceNodeId]: bodyFromThatSource }` —
// so a downstream {{sourceNodeId.field}} can target one specifically.
// isJoinBody detects that shape; flattenJoinBody merges it back into one
// plain object instead, so a node that wants *every* input combined can
// just use {{field}} everywhere, same as a single input. If two inputs
// share a prop name, the one that arrived later simply overwrites the
// earlier one — Object.values walks the join body in the order its keys
// were inserted, which is arrival order (settleJoin builds it by iterating
// its `arrived` Map, itself populated in arrival order) — so this is "last
// one in wins", not a lookup by source node id. Used by Mapper and JSON.
export function isJoinBody(body: unknown, incomingSourceIds: string[]): body is Record<string, unknown> {
    if (incomingSourceIds.length < 2) return false;
    if (!body || typeof body !== "object" || Array.isArray(body)) return false;
    return incomingSourceIds.every((id) => id in (body as Record<string, unknown>));
}

export function flattenJoinBody(body: Record<string, unknown>): Record<string, any> {
    const flat: Record<string, any> = {};
    for (const part of Object.values(body)) {
        if (part && typeof part === "object" && !Array.isArray(part)) Object.assign(flat, part);
    }
    return flat;
}

export function readPath(source: unknown, path: string): unknown {
    if (!source || !path) return undefined;
    return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);
}

// Replaces every `{{ some.path }}` in `template` with the matching value
// read from the node context — checks the current body first (e.g. a
// submitted form field), then the query string. Used by nodes like Static
// Page and HTTP Request so they can use data an earlier node collected.
export function renderTemplate(template: string, ctx: NodeContext): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path) => {
        const value = readPath(ctx.body, path) ?? readPath(ctx.query, path);
        return value === undefined || value === null ? "" : String(value);
    });
}

// Same {{field}} templating as renderTemplate, applied recursively through
// a JSON value — arrays and nested objects are walked, every string leaf
// is templated, everything else (numbers, booleans, null) passes through
// unchanged. Used by JSON Response, whose body can be an arbitrarily
// nested object or array — see lib/nodes/json.ts.
export function renderTemplateDeep(value: unknown, ctx: NodeContext): any {
    if (typeof value === "string") return renderTemplate(value, ctx);
    if (Array.isArray(value)) return value.map((item) => renderTemplateDeep(item, ctx));
    if (value && typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [key, v] of Object.entries(value)) out[key] = renderTemplateDeep(v, ctx);
        return out;
    }
    return value;
}