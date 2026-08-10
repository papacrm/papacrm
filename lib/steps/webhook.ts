import { matchesPath, nextEdgeTargets, type StepExecutor } from "./types";

const webhookStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
    // Matches on path only now, regardless of the configured method: a
    // webhook is what serves the workflow's page(s) (see lib/steps/
    // inputForm.ts), and a GET to render a page followed by a POST
    // submitting a form on it both need to land on the same node. The
    // configured "method" field is still saved with the node but no
    // longer gates routing.
    matchesTrigger(node, path) {
        return matchesPath(node, path);
    },
};

export default webhookStep;