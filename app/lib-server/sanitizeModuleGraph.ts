import { NODE_EXECUTORS } from "./nodes";

// Shared by app/router/modules.ts (DB-backed modules) and
// app/router/localModules.ts (file-backed modules) so a saved/imported
// graph is never trusted blindly in either place: anything that isn't a
// recognised node type is dropped, and any edge referencing a node that
// doesn't exist in the same payload is dropped too.
const NODE_TYPES = new Set(Object.keys(NODE_EXECUTORS));

export function sanitizeNodes(nodes: unknown): any[] {
    if (!Array.isArray(nodes)) return [];
    return nodes
        .filter((n) => n && typeof n === "object" && typeof n.id === "string" && NODE_TYPES.has(n.type))
        .map((n) => ({
            id: n.id,
            type: n.type,
            x: Number.isFinite(n.x) ? n.x : 0,
            y: Number.isFinite(n.y) ? n.y : 0,
            data: n.data && typeof n.data === "object" ? n.data : {},
        }));
}

export function sanitizeEdges(edges: unknown, nodeIds: Set<string>): any[] {
    if (!Array.isArray(edges)) return [];
    return edges
        .filter(
            (e) =>
                e &&
                typeof e === "object" &&
                typeof e.id === "string" &&
                typeof e.source === "string" &&
                typeof e.target === "string" &&
                nodeIds.has(e.source) &&
                nodeIds.has(e.target),
        )
        .map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: typeof e.sourceHandle === "string" ? e.sourceHandle : null,
            // See ModuleEdge.edgeType in lib/node-defs/types.ts — anything
            // other than exactly "data" is treated as the default
            // "workflow" edge, same as an edge with the field omitted
            // entirely (e.g. one saved before this field existed).
            ...(e.edgeType === "data" ? { edgeType: "data" as const } : {}),
        }));
}
