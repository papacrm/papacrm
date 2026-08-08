// Shared contracts for step *execution* (the server-side counterpart of
// app/lib/steps). Each step type exports one StepExecutor here — that's
// the only thing workflowEngine.ts needs to know about it. To add a new
// step's runtime behavior: create `<name>.ts` in this folder and register
// it in `index.ts`.

import type { IWorkflowNode, IWorkflowEdge } from "../models/Workflow";

export interface WebhookTrigger {
    method: string;
    query: Record<string, string>;
    body: unknown;
}

export type WorkflowResult =
    | { kind: "html"; status: number; html: string }
    | { kind: "json"; status: number; data: unknown }
    | { kind: "empty"; status: number };

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
    run(args: { node: IWorkflowNode; ctx: StepContext; trigger: WebhookTrigger; edges: IWorkflowEdge[] }): Promise<StepOutcome> | StepOutcome;
    // Only needed by steps reachable at /hooks/<path> (webhook, inputForm,
    // ...). Decides whether this node should handle an incoming request to
    // that path/method. Steps that are never a workflow's entry point (like
    // condition or httpRequest) omit this.
    matchesTrigger?(node: IWorkflowNode, path: string, method: string): boolean;
}

// Guards against accidental cycles in a hand-built graph turning a webhook
// hit into an infinite loop.
export const MAX_STEPS = 50;

export function matchesPath(node: IWorkflowNode, path: string): boolean {
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    return String(node.data?.path ?? "").replace(/^\/+|\/+$/g, "") === cleanPath;
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