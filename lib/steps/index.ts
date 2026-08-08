import type { WorkflowNodeType } from "../models/Workflow";
import type { StepExecutor } from "./types";
import webhookStep from "./webhook";
import inputFormStep from "./inputForm";
import httpRequestStep from "./httpRequest";
import conditionStep from "./condition";
import staticPageStep from "./staticPage";

// ─── Adding a new step ──────────────────────────────────────────────────
// 1. Create `lib/steps/<name>.ts` exporting a StepExecutor (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to STEP_EXECUTORS below.
// 3. Editor-side, add the matching `app/lib/steps/<name>.ts` — see that
//    folder's index.ts for the same pattern.
// workflowEngine.ts itself never needs to change.

export const STEP_EXECUTORS: Record<WorkflowNodeType, StepExecutor> = {
    webhook: webhookStep,
    inputForm: inputFormStep,
    httpRequest: httpRequestStep,
    condition: conditionStep,
    staticPage: staticPageStep,
};

export * from "./types";
