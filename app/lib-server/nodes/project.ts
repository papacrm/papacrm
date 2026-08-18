import { nextEdgeTargets, type NodeExecutor } from "./types";

const projectNode: NodeExecutor = {
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

        // If no fields selected, pass through unchanged
        if (selectedFields.length === 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        // Handle array format from Find: [{ _id, field1, field2, ..., createdAt, updatedAt }]
        if (Array.isArray(ctx.body)) {
            ctx.body = ctx.body.map((doc: any) => {
                const projected: Record<string, any> = {};
                for (const key of selectedFields) {
                    if (key in doc) {
                        projected[key] = doc[key];
                    }
                }
                return projected;
            });
        }
        // Handle a flat single-record shape from Find One
        else if (ctx.body && typeof ctx.body === "object") {
            const projected: Record<string, any> = {};
            for (const key of selectedFields) {
                if (key in (ctx.body as any)) {
                    projected[key] = (ctx.body as any)[key];
                }
            }
            ctx.body = projected;
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default projectNode;
