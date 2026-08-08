import type { IWorkflowNode, IWorkflowEdge } from "./models/Workflow";
import { STEP_EXECUTORS } from "./steps";
import type { StepContext, WebhookTrigger, WorkflowResult } from "./steps/types";

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
): Promise<WorkflowResult> {
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const ctx: StepContext = { query: trigger.query, body: trigger.body };

    let currentId: string | undefined = startNodeId;
    let steps = 0;
    const MAX_STEPS = 50; // guards against cycles in a hand-built graph

    while (currentId && steps < MAX_STEPS) {
        steps++;
        const node = nodeById.get(currentId);
        if (!node) break;

        const executor = STEP_EXECUTORS[node.type];
        if (!executor) break;

        const outcome = await executor.run({ node, ctx, trigger, edges });
        if (outcome.done) return outcome.result;
        currentId = outcome.nextNodeId;
    }

    return { kind: "empty", status: 204 };
}
