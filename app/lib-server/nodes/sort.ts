import { nextEdgeTargets, type NodeExecutor } from "./types";

const sortNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const sortSpec = (() => {
            try {
                return JSON.parse(String(node.data?.sort ?? "{}"));
            } catch {
                return {};
            }
        })();

        if (Object.keys(sortSpec).length === 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        const [sortKey, sortOrder] = Object.entries(sortSpec)[0] as [string, number];
        const compareFn = (a: any, b: any) => {
            // Handle both flattened documents (new) and nested data format (old)
            const aVal = a[sortKey] ?? a.data?.[sortKey];
            const bVal = b[sortKey] ?? b.data?.[sortKey];

            if (aVal === bVal) return 0;
            if (aVal === undefined || aVal === null) return 1;
            if (bVal === undefined || bVal === null) return -1;

            const cmp = aVal < bVal ? -1 : 1;
            return sortOrder === -1 ? -cmp : cmp;
        };

        // Handle array format (from Find)
        if (Array.isArray(ctx.body)) {
            ctx.body = [...ctx.body].sort(compareFn);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default sortNode;
