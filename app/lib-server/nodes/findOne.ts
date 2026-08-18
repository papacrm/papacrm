import { connectDB } from "../mongoose";
import List from "../models/List";
import Module from "../models/Module";
import { findOneDocument } from "./listData";
import { nextEdgeTargets, type NodeExecutor } from "./types";

const findOneNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);

        // Accept two input formats:
        // 1. Array from Find/Match nodes - take first document
        if (Array.isArray(ctx.body)) {
            const firstDoc = ctx.body.length > 0 ? ctx.body[0] : null;

            if (!firstDoc) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            // Already flattened by Find node
            ctx.body = firstDoc;
            return { done: false, nextNodeIds };
        }

        // 2. { listId } from List/ListUpsert nodes - fetch first document from database
        const listId = String((ctx.body as any)?.listId ?? "").trim();

        if (!listId) {
            ctx.body = null;
            return { done: false, nextNodeIds };
        }

        try {
            await connectDB();
            const module = await Module.findById(ctx.moduleId).select("owner").lean();
            if (!module) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            const list = await List.findById(listId).lean();
            if (!list || String((list as any).owner) !== String((module as any).owner)) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            // Smart filtering: detect Match node either before or after Find One
            // and apply its query at DB level.
            let whereField = "";
            let whereOperator = "equals";
            let whereValue = "";

            // Check if Match is chained BEFORE Find One (List → Match → FindOne)
            const incomingEdges = edges.filter((e) => e.target === node.id);
            if (incomingEdges.length === 1) {
                const prevNode = nodes.find((n) => n.id === incomingEdges[0].source);
                if (prevNode?.type === "match") {
                    const query = (() => {
                        try {
                            return JSON.parse(String(prevNode.data?.query ?? "{}"));
                        } catch {
                            return {};
                        }
                    })();

                    // Skip the DB-level optimization for an operator
                    // condition (e.g. { "$gt": 3 }) — buildWhereQuery can't
                    // express it, and stringifying it produces a filter
                    // that never matches. Let Match filter in memory
                    // instead (see ./match.ts).
                    const entries = Object.entries(query);
                    if (entries.length === 1 && entries[0][1] !== null && typeof entries[0][1] !== "object") {
                        const [key, value] = entries[0];
                        whereField = key;
                        whereOperator = "equals";
                        whereValue = String(value);
                    }
                }
            }

            // If not found before, check if Match is chained AFTER Find One (FindOne → Match)
            if (!whereField && nextNodeIds.length === 1) {
                const nextNode = nodes.find((n) => n.id === nextNodeIds[0]);
                if (nextNode?.type === "match") {
                    const query = (() => {
                        try {
                            return JSON.parse(String(nextNode.data?.query ?? "{}"));
                        } catch {
                            return {};
                        }
                    })();

                    const entries = Object.entries(query);
                    if (entries.length === 1 && entries[0][1] !== null && typeof entries[0][1] !== "object") {
                        const [key, value] = entries[0];
                        whereField = key;
                        whereOperator = "equals";
                        whereValue = String(value);
                    }
                }
            }

            const found = await findOneDocument(list, whereField, whereOperator, whereValue);

            if (!found) {
                ctx.body = null;
                return { done: false, nextNodeIds };
            }

            ctx.body = {
                ...found.data,
                _id: found._id,
                ...(found.createdAt && { createdAt: found.createdAt }),
                ...(found.updatedAt && { updatedAt: found.updatedAt }),
            };
        } catch {
            ctx.body = null;
        }

        return { done: false, nextNodeIds };
    },
};

export default findOneNode;
