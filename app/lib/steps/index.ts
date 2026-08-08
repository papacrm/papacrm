import type { WorkflowNodeType, WorkflowNodeDef } from "./types";
import webhookStep from "./webhook";
import inputFormStep from "./inputForm";
import httpRequestStep from "./httpRequest";
import conditionStep from "./condition";
import staticPageStep from "./staticPage";

// ─── Adding a new step ──────────────────────────────────────────────────
// 1. Create `app/lib/steps/<name>.ts` exporting a WorkflowNodeDef (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to NODE_DEFS + NODE_ORDER below.
// 3. If it needs to actually run when a workflow executes (not just be
//    editable), add a matching `lib/steps/<name>.ts` on the server side —
//    see that folder's index.ts for the same pattern.
// Nothing else in the editor needs to change.

export const NODE_DEFS: Record<WorkflowNodeType, WorkflowNodeDef> = {
    webhook: webhookStep,
    inputForm: inputFormStep,
    httpRequest: httpRequestStep,
    condition: conditionStep,
    staticPage: staticPageStep,
};

export const NODE_ORDER: WorkflowNodeType[] = ["webhook", "inputForm", "httpRequest", "condition", "staticPage"];

export * from "./types";
