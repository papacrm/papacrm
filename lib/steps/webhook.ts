import { matchPath, nextEdgeTargets, type StepExecutor } from "./types";

const webhookStep: StepExecutor = {
    run({ node, ctx, trigger, edges }) {
        // A webhook's path can contain `[param]` segments (e.g.
        // "something/[id]") — fold whatever the request actually matched
        // into the shared query bucket so every step downstream can read
        // it the same way it reads a real query string param, via
        // {{ id }}. See matchPath in ./types.
        const params = matchPath(String(node.data?.path ?? ""), trigger.path ?? "");
        if (params) ctx.query = { ...ctx.query, ...params };
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
    // Matches on path only now, regardless of the configured method: a
    // webhook is what serves the workflow's page(s) (see lib/steps/
    // inputForm.ts), and a GET to render a page followed by a POST
    // submitting a form on it both need to land on the same node. The
    // configured "method" field is still saved with the node but no
    // longer gates routing. `[param]` segments are matched, not compared
    // literally — see matchPath.
    matchesTrigger(node, path) {
        return matchPath(String(node.data?.path ?? ""), path) !== null;
    },
};

export default webhookStep;
