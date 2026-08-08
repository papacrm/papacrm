import type { IWorkflowNode, IWorkflowEdge } from "./models/Workflow";
import { STEP_EXECUTORS } from "./steps";
import { MAX_STEPS, type StepContext, type WebhookTrigger, type WorkflowResult } from "./steps/types";

export type { WebhookTrigger, WorkflowResult };

// Finds the trigger node (if any) that should handle an incoming request to
// /hooks/<path>. Delegates to each node type's own `matchesTrigger` — this
// function doesn't know (or need to know) which types are trigger-capable.
export function findWebhookNode(nodes: IWorkflowNode[], path: string, method: string): IWorkflowNode | undefined {
    return nodes.find((n) => STEP_EXECUTORS[n.type]?.matchesTrigger?.(n, path, method));
}

export async function runWorkflow(
    nodes: IWorkflowNode[],
    edges: IWorkflowEdge[],
    startNodeId: string,
    trigger: WebhookTrigger,
    workflowId: string,
): Promise<WorkflowResult> {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    // Shared across every branch of the run, including parallel ones — a
    // step mutates `ctx.body` (e.g. an Input Form's submission) and every
    // node downstream, on every branch, sees that update. This is the
    // "context between steps" that lets a page later in the chain read a
    // value someone typed into a form earlier in the chain.
    const ctx: StepContext = { query: trigger.query, body: trigger.body, workflowId };
    let stepsRun = 0;

    // A node can fan out to more than one next node (e.g. one branch saves
    // to the database while a parallel branch renders the response page).
    // Each branch is walked independently and recursively; branches run
    // concurrently via Promise.all. Only one HTTP response can ever be
    // sent, so once every branch has finished, the first one that actually
    // produced a result (not just a side effect) wins.
    async function runFrom(nodeId: string): Promise<WorkflowResult | undefined> {
        if (stepsRun >= MAX_STEPS) return undefined; // guards against cycles
        stepsRun++;

        const node = nodeById.get(nodeId);
        if (!node) return undefined;

        const executor = STEP_EXECUTORS[node.type];
        if (!executor) return undefined;

        const outcome = await executor.run({ node, ctx, trigger, edges });
        if (outcome.done) return outcome.result;

        const branchResults = await Promise.all(outcome.nextNodeIds.map((id) => runFrom(id)));
        return branchResults.find((r) => r && r.kind !== "empty") ?? branchResults.find((r) => r !== undefined);
    }

    const result = await runFrom(startNodeId);
    return result ?? { kind: "empty", status: 204 };
}