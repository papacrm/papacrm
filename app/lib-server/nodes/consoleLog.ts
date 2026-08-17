import { nextEdgeTargets, type NodeExecutor } from "./types";

const consoleLogNode: NodeExecutor = {
    run({ node, ctx, edges }) {
        const shouldLog = node.data?.enabled !== false;

        if (shouldLog) {
            console.log("[Module Log]", ctx.body);
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default consoleLogNode;
