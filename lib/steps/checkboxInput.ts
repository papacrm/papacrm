import { nextEdgeTargets, type StepExecutor } from "./types";

const checkboxInputStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If this checkbox has a name, pass its value to the next step
        if (name && ctx.body && typeof ctx.body === "object") {
            ctx.body[name] = ctx.body[name] ?? false;
        }

        return { done: false, nextNodeIds };
    },
};

export default checkboxInputStep;
