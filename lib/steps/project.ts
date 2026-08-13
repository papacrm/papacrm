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

        // If no fields selected, pass through unchanged
        if (selectedFields.length === 0) {
            return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
        }

        // Handle structured format: { fields, documents }
        if (ctx.body && typeof ctx.body === "object" && "documents" in ctx.body && Array.isArray((ctx.body as any).documents)) {
            const existingFields = Array.isArray((ctx.body as any).fields) ? (ctx.body as any).fields : [];

            // Filter fields array to only selected ones from list schema
            const projectedFields = existingFields.filter((f: any) => selectedFields.includes(f.key));

            // Add system fields (_id, createdAt, updatedAt) if selected
            const systemFields = [];
            if (selectedFields.includes("_id")) {
                systemFields.push({ key: "_id", label: "_id", type: "text" });
            }
            if (selectedFields.includes("createdAt")) {
                systemFields.push({ key: "createdAt", label: "createdAt", type: "date" });
            }
            if (selectedFields.includes("updatedAt")) {
                systemFields.push({ key: "updatedAt", label: "updatedAt", type: "date" });
            }

            // Combine system fields with list fields
            const allFields = [...systemFields, ...projectedFields];

            // Filter document data to only selected fields
            const projectedDocuments = (ctx.body as any).documents.map((doc: any) => {
                const projectedData: Record<string, any> = {};
                for (const key of selectedFields) {
                    if (key === "_id") {
                        projectedData._id = doc._id;
                    } else if (key === "createdAt") {
                        projectedData.createdAt = doc.createdAt;
                    } else if (key === "updatedAt") {
                        projectedData.updatedAt = doc.updatedAt;
                    } else {
                        projectedData[key] = doc.data?.[key];
                    }
                }
                return {
                    _id: doc._id,
                    data: projectedData,
                    ...(selectedFields.includes("createdAt") && { createdAt: doc.createdAt }),
                    ...(selectedFields.includes("updatedAt") && { updatedAt: doc.updatedAt }),
                };
            });

            ctx.body = { fields: allFields, documents: projectedDocuments };
        }
        // Handle plain array format: [{ _id, data, createdAt, updatedAt }]
        else if (Array.isArray(ctx.body)) {
            const projectedDocuments = ctx.body.map((doc: any) => {
                const projectedData: Record<string, any> = {};
                for (const key of selectedFields) {
                    if (key === "_id") {
                        projectedData._id = doc._id;
                    } else if (key === "createdAt") {
                        projectedData.createdAt = doc.createdAt;
                    } else if (key === "updatedAt") {
                        projectedData.updatedAt = doc.updatedAt;
                    } else {
                        projectedData[key] = doc.data?.[key];
                    }
                }
                return {
                    _id: doc._id,
                    data: projectedData,
                    ...(selectedFields.includes("createdAt") && { createdAt: doc.createdAt }),
                    ...(selectedFields.includes("updatedAt") && { updatedAt: doc.updatedAt }),
                };
            });

            // Convert to structured format with fields list
            const fields = [];

            // Add system fields if selected
            if (selectedFields.includes("_id")) {
                fields.push({ key: "_id", label: "_id", type: "text" });
            }
            if (selectedFields.includes("createdAt")) {
                fields.push({ key: "createdAt", label: "createdAt", type: "date" });
            }
            if (selectedFields.includes("updatedAt")) {
                fields.push({ key: "updatedAt", label: "updatedAt", type: "date" });
            }

            // Add data fields
            const dataFieldKeys = selectedFields.filter((key) => key !== "_id" && key !== "createdAt" && key !== "updatedAt");
            fields.push(...dataFieldKeys.map((key) => ({ key, label: key })));

            ctx.body = { fields, documents: projectedDocuments };
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default projectStep;
