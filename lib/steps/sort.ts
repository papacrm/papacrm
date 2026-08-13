import { nextEdgeTargets, type StepExecutor } from "./types";

const sortStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const sortSpec = (() => {
            try {
                return JSON.parse(String(node.data?.sort ?? "{}"));
            } catch {
                return {};
            }
        })();

        // Sort documents in ctx.body
        if (Array.isArray(ctx.body) && Object.keys(sortSpec).length > 0) {
            const [sortKey, sortOrder] = Object.entries(sortSpec)[0] as [string, number];
            ctx.body = [...ctx.body].sort((a, b) => {
                const aVal = a.data?.[sortKey];
                const bVal = b.data?.[sortKey];

                if (aVal === bVal) return 0;
                if (aVal === undefined || aVal === null) return 1;
                if (bVal === undefined || bVal === null) return -1;

                const cmp = aVal < bVal ? -1 : 1;
                return sortOrder === -1 ? -cmp : cmp;
            });
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default sortStep;
