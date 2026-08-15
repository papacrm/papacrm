import { nextEdgeTargets, type NodeExecutor } from "./types";

// Same "pass my current value along" contract as Text Input/Checkbox/
// Number Input — see textInput.ts for the full reasoning on the State
// hand-off. The dropdown's own option list is resolved when a View
// renders it (see ./view.ts); this only carries the selected value
// forward for {{field}} templating downstream.
const selectInputNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const name = String(node.data?.name ?? "");
        const nextNodeIds = nextEdgeTargets(node, edges);

        if (name && ctx.body && typeof ctx.body === "object") {
            const stateData = ctx.stateValues?.data;
            const fromState = stateData && Object.prototype.hasOwnProperty.call(stateData, name) ? stateData[name] : undefined;
            ctx.body[name] = fromState ?? ctx.body[name] ?? "";
        }

        return { done: false, nextNodeIds };
    },
};

export default selectInputNode;
