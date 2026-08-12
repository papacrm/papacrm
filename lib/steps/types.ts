// Shared contracts for step *execution* (the server-side counterpart of
// app/lib/steps). Each step type exports one StepExecutor here — that's
// the only thing workflowEngine.ts needs to know about it. To add a new
// step's runtime behavior: create `<name>.ts` in this folder and register
// it in `index.ts`.

import type { IWorkflowNode, IWorkflowEdge } from "../models/Workflow";

export interface WebhookTrigger {
    method: string;
    // Raw request path (e.g. "something/abc123"), used to extract [param]
    // segments against the matching webhook node's configured path — see
    // matchPath below and lib/steps/webhook.ts.
    path: string;
    query: Record<string, string>;
    body: unknown;
    // Incoming request headers, lower-cased keys (Node lower-cases them
    // already, but this keeps lookups predictable regardless of source).
    // Used by Get Header — see lib/steps/getHeader.ts.
    headers: Record<string, string>;
    // Incoming request cookies, parsed from the Cookie header. Used by Get
    // Cookie — see lib/steps/getCookie.ts.
    cookies: Record<string, string>;
}

// A step that wants to render a page hands back a *description* of that
// page — which React component to use (looked up in
// app/components/webhooks/registry.tsx) and the props it needs — rather
// than a pre-rendered HTML string. The endpoint (server/hooks/[...path].ts,
// middleware.ts) is what actually turns this into HTML, via NukeJS's
// `renderComponent()`. That keeps step executors framework-agnostic (no
// React, no SSR calls in here) while still getting real NukeJS SSR —
// `useHtml()`, layouts, etc. — for every workflow-rendered page, plus
// automatic escaping (no more hand-rolled `escapeHtml`).
export type WorkflowPageComponent = "staticPage" | "inputForm" | "table" | "container" | "view";

export interface WorkflowPage {
    title: string;
    component: WorkflowPageComponent;
    props: Record<string, unknown>;
}

// Carried by every WorkflowResult variant so a step anywhere in the run
// (Set Header / Set Cookie — see lib/steps/setHeader.ts and
// lib/steps/setCookie.ts) can affect the actual HTTP response, no matter
// which branch of a fan-out ends up producing the page/json/empty result.
// Populated from ctx.responseHeaders / ctx.setCookies once the run
// finishes — see runWorkflow in ../workflowEngine.ts.
interface WorkflowResultExtras {
    headers?: Record<string, string>;
    cookies?: SetCookieInstruction[];
    // Queued by Html (lib/steps/html.ts) — applied to the rendered page's
    // <html> element regardless of which step actually produces the page,
    // same reasoning as headers/cookies above.
    htmlAttrs?: { lang?: string; className?: string };
    // Queued by Load CSS (lib/steps/css.ts) — raw <style> block contents.
    styles?: string[];
    // Queued by Html/Load CSS/State (lib/steps/state.ts) — raw inline
    // <script> bodies, injected at the end of <body>.
    scripts?: string[];
}

export interface SetCookieInstruction {
    name: string;
    value: string;
    maxAge?: number;
    httpOnly?: boolean;
}

export type WorkflowResult =
    | ({ kind: "page"; status: number; page: WorkflowPage } & WorkflowResultExtras)
    | ({ kind: "json"; status: number; data: unknown } & WorkflowResultExtras)
    | ({ kind: "empty"; status: number } & WorkflowResultExtras);

export interface StepContext {
    query: Record<string, string>;
    // Shared, mutable "current data" for the run — trigger steps (webhook,
    // inputForm) set this to whatever was submitted; every step downstream
    // (including parallel branches) sees the same object, so a step like
    // Static Page can read a value a person typed into an earlier Input
    // Form step. See `renderTemplate` below for the `{{ field }}` syntax
    // steps use to pull values out of it.
    body: any;
    // id of the workflow currently running — steps that persist data (e.g.
    // Save to Database) need this to know which workflow a record belongs to.
    workflowId: string;
    // How many "Call" steps deep this run is nested (0 for a run started by
    // a real webhook/function trigger). Incremented by lib/steps/call.ts
    // each time it starts a sub-workflow — see MAX_CALL_DEPTH below.
    callDepth: number;
    // Response headers queued by Set Header steps (lib/steps/setHeader.ts),
    // applied to the real HTTP response once the run finishes. Shared
    // across every branch, same as `body`.
    responseHeaders: Record<string, string>;
    // Set-Cookie instructions queued by Set Cookie steps
    // (lib/steps/setCookie.ts), applied the same way.
    setCookies: SetCookieInstruction[];
    // Content produced by a Call step (lib/steps/call.ts), keyed by the
    // called Function node's id. A View that has a Function wired into it
    // (see EMBEDDABLE_TYPES in lib/steps/view.ts) renders an empty "slot"
    // block for it by default — if that same function was actually called
    // earlier in this run, the slot is filled with whatever's recorded
    // here instead. Shared across branches, same as `body`.
    slotContent: Record<string, string>;
    // Same idea as `slotContent`, but a whole nested block layout instead
    // of plain text — set by lib/steps/call.ts, right before it starts a
    // sub-run, when the Call step it's running for is itself fed by a
    // View (see `viewOutput` below). Keyed by the called Function node's
    // id, read back in lib/steps/view.ts's resolveChildren.
    slotBlocks: Record<string, unknown[]>;
    // Queued by Html (lib/steps/html.ts) — merged shallowly as each Html
    // step runs, so a later Html step overrides an earlier one's lang/
    // className but leaves the other untouched. Folded onto the final
    // WorkflowResult the same way responseHeaders/setCookies are — see
    // runWorkflow below.
    htmlAttrs: { lang?: string; className?: string };
    // Queued by Load CSS (lib/steps/css.ts) — one entry per step run.
    clientStyles: string[];
    // Queued by Load CSS and State (lib/steps/css.ts, lib/steps/state.ts)
    // — raw inline <script> bodies, applied the same way.
    clientScripts: string[];
    // A View that chains into something other than another View (e.g. a
    // Call step) renders its own blocks right there instead of just
    // forwarding — see lib/steps/view.ts — and stashes them here, keyed by
    // its own node id, so a Call step reached right after it (see
    // lib/steps/call.ts) can pass them along to whatever Function it
    // calls. This is how "View → Call (a layout's Function)" ends up
    // rendering the View's content inside that shared layout instead of
    // as its own page.
    viewOutput: Record<string, { title: string; blocks: unknown[] }>;
}

export type StepOutcome =
    // Ends this branch and sends `result` back as the HTTP response — only
    // wins if no *other* branch of a fan-out also finishes with a result
    // (see runWorkflow in ../workflowEngine.ts for how that's resolved).
    | { done: true; result: WorkflowResult }
    // Moves on to every node in `nextNodeIds`, run concurrently. An empty
    // array (e.g. an output handle with nothing wired to it) ends this
    // branch with no result.
    | { done: false; nextNodeIds: string[] };

export interface StepExecutor {
    run(args: {
        node: IWorkflowNode;
        ctx: StepContext;
        trigger: WebhookTrigger;
        edges: IWorkflowEdge[];
        // Every node in the workflow, not just this one — needed by View
        // (see lib/steps/view.ts) to look up the actual data of the
        // page-building blocks (Menu, Tabs, Navbar, Footer, Table, Input
        // Form, nested View) wired into it. Most steps never touch this.
        nodes: IWorkflowNode[];
        // True only for the node the run actually starts at — either the
        // webhook node matched by `findWebhookNode`, or (when the request
        // is a form submission — see runWorkflow in ../workflowEngine.ts)
        // the specific Input Form node named by the request's `__step`
        // field. False for every node reached by following an edge from
        // another step. This is what lets Input Form tell "this request is
        // *my* submission" apart from "a previous step just handed control
        // to me" — see lib/steps/inputForm.ts, which needs that distinction
        // to support Input Form → Input Form chains (an Input Form step
        // reached mid-chain must render its own form, not reinterpret
        // whatever request started the chain as its submission).
        isEntry: boolean;
    }): Promise<StepOutcome> | StepOutcome;
    // Only needed by steps reachable at /<path> (webhook, inputForm, ...).
    // Decides whether this node should handle an incoming request to that
    // path/method. Steps that are never a workflow's entry point (like
    // condition or httpRequest) omit this.
    matchesTrigger?(node: IWorkflowNode, path: string, method: string): boolean;
}

// Guards against accidental cycles in a hand-built graph turning a webhook
// hit into an infinite loop.
export const MAX_STEPS = 50;

// Guards against a Call step (see lib/steps/call.ts) starting a
// sub-workflow that itself calls another workflow, and so on — including a
// workflow calling itself, directly or via a longer cycle. Each nesting
// level still gets its own MAX_STEPS budget, so this bounds the *depth* of
// recursion, not the total amount of work.
export const MAX_CALL_DEPTH = 10;

export function matchesPath(node: IWorkflowNode, path: string): boolean {
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
// than one next step — e.g. one branch saves to the database while another
// renders the response page). Pass `sourceHandle` for branch-style steps
// (e.g. "true"/"false"); omit it for single-handle steps.
export function nextEdgeTargets(node: IWorkflowNode, edges: IWorkflowEdge[], sourceHandle?: string): string[] {
    return edges.filter((e) => e.source === node.id && (sourceHandle === undefined || e.sourceHandle === sourceHandle)).map((e) => e.target);
}

export function readPath(source: unknown, path: string): unknown {
    if (!source || !path) return undefined;
    return path.split(".").reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);
}

// Replaces every `{{ some.path }}` in `template` with the matching value
// read from the step context — checks the current body first (e.g. a
// submitted form field), then the query string. Used by steps like Static
// Page and HTTP Request so they can use data an earlier step collected.
export function renderTemplate(template: string, ctx: StepContext): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path) => {
        const value = readPath(ctx.body, path) ?? readPath(ctx.query, path);
        return value === undefined || value === null ? "" : String(value);
    });
}

// Same {{field}} templating as renderTemplate, applied recursively through
// a JSON value — arrays and nested objects are walked, every string leaf
// is templated, everything else (numbers, booleans, null) passes through
// unchanged. Used by JSON Response, whose body can be an arbitrarily
// nested object or array — see lib/steps/json.ts.
export function renderTemplateDeep(value: unknown, ctx: StepContext): any {
    if (typeof value === "string") return renderTemplate(value, ctx);
    if (Array.isArray(value)) return value.map((item) => renderTemplateDeep(item, ctx));
    if (value && typeof value === "object") {
        const out: Record<string, any> = {};
        for (const [key, v] of Object.entries(value)) out[key] = renderTemplateDeep(v, ctx);
        return out;
    }
    return value;
}