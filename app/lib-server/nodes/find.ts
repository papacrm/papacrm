import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import { findDocuments } from "./listData";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const findNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        const listId = String((ctx.body as any)?.listId ?? "").trim();

        if (!listId) {
            ctx.body = [];
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = [];
                return { done: false, nextNodeIds };
            }

            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) {
                ctx.body = [];
                return { done: false, nextNodeIds };
            }

            // Smart filtering: if Match is chained directly after Find,
            // extract its query and apply at DB level instead of fetching all
            // documents and filtering in memory.
            let whereField = "";
            let whereOperator = "equals";
            let whereValue = "";

            if (nextNodeIds.length === 1) {
                const nextNode = nodes.find((n) => n.id === nextNodeIds[0]);
                if (nextNode?.type === "match") {
                    const query = (() => {
                        try {
                            return JSON.parse(String(nextNode.data?.query ?? "{}"));
                        } catch {
                            return {};
                        }
                    })();

                    // Only optimize single-field exact-match queries for now
                    // (buildWhereQuery supports equals/notEquals/contains, but
                    // Match's JSON query can also be exact equality checks).
                    // An operator condition (e.g. { "$gt": 3 }) can't be
                    // expressed by buildWhereQuery — stringifying it used to
                    // produce "[object Object]", a DB filter that can never
                    // match anything real. Skip the DB-level optimization
                    // for those and let Match filter in memory instead,
                    // where it has full operator support (see ./match.ts).
                    const entries = Object.entries(query);
                    if (entries.length === 1 && entries[0][1] !== null && typeof entries[0][1] !== "object") {
                        const [key, value] = entries[0];
                        whereField = key;
                        whereOperator = "equals";
                        whereValue = String(value);
                    }
                }
            }

            const documents = await findDocuments(list, whereField, whereOperator, whereValue);

            // Return array of flattened documents: [{ _id, field1, field2, ... }, ...]
            ctx.body = documents.map((doc) => ({
                ...doc.data,
                _id: doc._id,
                ...(doc.createdAt && { createdAt: doc.createdAt }),
                ...(doc.updatedAt && { updatedAt: doc.updatedAt }),
            }));
        } catch {
            ctx.body = [];
        }

        return { done: false, nextNodeIds };
    },
};

export default findNode;
