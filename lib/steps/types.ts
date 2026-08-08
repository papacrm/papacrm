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
    body: any;
}

export type StepOutcome =
    // Ends the run and sends `result` back as the HTTP response.
    | { done: true; result: WorkflowResult }
    // Moves on to `nextNodeId` (or ends with an empty 204 if undefined —
    // e.g. an output handle with nothing wired to it).
    | { done: false; nextNodeId?: string };

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

// Follows the single outgoing edge from `node`. Pass `sourceHandle` for
// branch-style steps (e.g. "true"/"false"); omit it for single-output steps.
export function nextEdgeTarget(node: IWorkflowNode, edges: IWorkflowEdge[], sourceHandle?: string): string | undefined {
    return edges.find((e) => e.source === node.id && (sourceHandle === undefined || e.sourceHandle === sourceHandle))?.target;
}
