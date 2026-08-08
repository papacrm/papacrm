import { matchesPath, nextEdgeTarget, type StepExecutor } from "./types";

const webhookStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeId: nextEdgeTarget(node, edges) };
    },
    matchesTrigger(node, path, method) {
        return matchesPath(node, path) && String(node.data?.method ?? "POST").toUpperCase() === method.toUpperCase();
    },
};

export default webhookStep;
