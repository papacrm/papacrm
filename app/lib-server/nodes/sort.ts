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
            const aVal = a.data?.[sortKey];
            const bVal = b.data?.[sortKey];

            if (aVal === bVal) return 0;
            if (aVal === undefined || aVal === null) return 1;
            if (bVal === undefined || bVal === null) return -1;

            const cmp = aVal < bVal ? -1 : 1;
            return sortOrder === -1 ? -cmp : cmp;
        };

        // Handle both array and { fields, documents } formats
        if (Array.isArray(ctx.body)) {
            ctx.body = [...ctx.body].sort(compareFn);
        } else if (ctx.body && typeof ctx.body === "object" && Array.isArray(ctx.body.documents)) {
            ctx.body.documents = [...ctx.body.documents].sort(compareFn);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default sortNode;
