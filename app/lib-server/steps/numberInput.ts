import { nextEdgeTargets, type StepExecutor } from "./types";

const numberInputStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        // If this input has a name, pass its value to the next step. A
        // State step chained directly into this one (state -> input) wins,
        // else keep whatever's already there, defaulting to 0.
        if (name && ctx.body && typeof ctx.body === "object") {
            const stateData = ctx.stateValues?.data;
            const fromState = stateData && Object.prototype.hasOwnProperty.call(stateData, name) ? stateData[name] : undefined;
            ctx.body[name] = fromState ?? ctx.body[name] ?? 0;
        }

        return { done: false, nextNodeIds };
    },
};

export default numberInputStep;
