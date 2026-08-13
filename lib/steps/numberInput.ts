import { nextEdgeTargets, type StepExecutor } from "./types";

const numberInputStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If this input has a name and a value, pass it to the next step
        if (name && ctx.body && typeof ctx.body === "object") {
            ctx.body[name] = ctx.body[name] ?? 0;
        }

        return { done: false, nextNodeIds };
    },
};

export default numberInputStep;
