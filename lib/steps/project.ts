import { nextEdgeTargets, type StepExecutor } from "./types";

const projectStep: StepExecutor = {
    run({ node, ctx, edges }) {
        // Support both old JSON format and new array format
        let selectedFields: string[] = [];

        try {
            const raw = node.data?.selectedFields ?? node.data?.fields;
            if (Array.isArray(JSON.parse(raw))) {
                selectedFields = JSON.parse(raw);
            } else {
                // Old JSON format - convert to array
                const obj = JSON.parse(raw);
                selectedFields = Object.keys(obj).filter((key) => obj[key] === 1);
            }
        } catch {
            selectedFields = [];
        }

        // Project fields on documents in ctx.body
        if (Array.isArray(ctx.body) && selectedFields.length > 0) {
            ctx.body = ctx.body.map((doc) => ({
                _id: doc._id,
                data: selectedFields.reduce(
                    (acc, key) => {
                        if (key === "_id") {
                            acc._id = doc._id;
                        } else {
                            acc[key] = doc.data?.[key];
                        }
                        return acc;
                    },
                    {} as Record<string, any>,
                ),
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            }));
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default projectStep;
