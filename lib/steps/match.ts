import { nextEdgeTargets, type StepExecutor } from "./types";

const matchStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const query = (() => {
            try {
                return JSON.parse(String(node.data?.query ?? "{}"));
            } catch {
                return {};
            }
        })();

        // Filter documents in ctx.body
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.filter((doc) => {
                for (const [key, value] of Object.entries(query)) {
                    if (doc.data?.[key] !== value) {
                        return false;
                    }
                }
                return true;
            });
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default matchStep;
