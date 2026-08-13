import { nextEdgeTargets, type StepExecutor } from "./types";

const textInputStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If this input has a name and a value, pass it to the next step
        if (name && ctx.body && typeof ctx.body === "object") {
            ctx.body[name] = ctx.body[name] ?? "";
        }

        return { done: false, nextNodeIds };
    },
};

export default textInputStep;
