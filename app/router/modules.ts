import { ORPCError } from "@orpc/server";
import { authed } from "../lib-server/orpc/auth";
import { connectDB } from "../lib-server/mongoose";
import Module from "../lib-server/models/Module";
import { NODE_EXECUTORS } from "../lib-server/nodes";

// Derived from the node registry (lib/nodes) rather than hand-listed here —
// a type only has to be registered once, in lib/nodes/index.ts, to be
// accepted everywhere, including on save.
const NODE_TYPES = new Set(Object.keys(NODE_EXECUTORS));
const MAX_NAME_LENGTH = 120;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function serializeModule(doc: any) {
    return {
        _id: String(doc._id),
        name: doc.name as string,
        active: Boolean(doc.active),
        nodes: doc.nodes ?? [],
        edges: doc.edges ?? [],
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    };
}

// Never trust a saved graph blindly — drop anything that isn't a
// recognised node type, and drop any edge that references a node that
// doesn't exist in the same payload.
function sanitizeNodes(nodes: unknown): any[] {
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

function sanitizeEdges(edges: unknown, nodeIds: Set<string>): any[] {
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
        }));
}

export const list = authed.handler(async ({ context }) => {
    await connectDB();
    const modules = await Module.find({ owner: context.user._id }).sort({ updatedAt: -1 }).lean();
    return modules.map(serializeModule);
});

// Backs the Call node's "another module" picker in the editor. Only
// modules that (a) have no Webhook node at all — those are treated as
// request-handling modules, not callable function libraries — and (b)
// have at least one *public* Function node are returned, and only the
// public functions are listed for each. Private functions never leave the
// server via this endpoint.
export const listCallable = authed.handler(async ({ context }) => {
    await connectDB();
    const modules = await Module.find({ owner: context.user._id }).select("name nodes").lean();

    return modules
        .map((w) => {
            const nodes = (w as any).nodes ?? [];
            if (nodes.some((n: any) => n.type === "webhook")) return null;

            const functions = nodes
                .filter((n: any) => n.type === "function" && n.data?.visibility === "public")
                .map((n: any) => ({ id: n.id as string, name: String(n.data?.name || "Untitled function") }));
            if (functions.length === 0) return null;

            return { _id: String(w._id), name: w.name as string, functions };
        })
        .filter((w): w is { _id: string; name: string; functions: { id: string; name: string }[] } => w !== null);
});

// Backs the Route and Forward nodes' "webhook to target" picker. Flat list
// of every Webhook node across the person's own modules — Function nodes
// are never included, since those two nodes are specifically about
// jumping to another *URL-triggered* entry point, not calling a function.
export const listWebhooks = authed.handler(async ({ context }) => {
    await connectDB();
    const modules = await Module.find({ owner: context.user._id }).select("name nodes").lean();

    return modules.flatMap((w) =>
        ((w as any).nodes ?? [])
            .filter((n: any) => n.type === "webhook")
            .map((n: any) => ({
                moduleId: String(w._id),
                moduleName: w.name as string,
                nodeId: n.id as string,
                path: String(n.data?.path || ""),
                method: String(n.data?.method || "GET"),
            })),
    );
});

export const get = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    await connectDB();
    const module = await Module.findOne({ _id: id, owner: context.user._id }).lean();
    if (!module) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    return serializeModule(module);
});

export const create = authed.handler(async ({ input, context }) => {
    const name = String((input as any)?.name ?? "").trim().slice(0, MAX_NAME_LENGTH) || "Untitled module";

    await connectDB();
    const module = await Module.create({ owner: context.user._id, name, nodes: [], edges: [], active: false });
    return serializeModule(module);
});

export const update = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    await connectDB();
    const module = await Module.findOne({ _id: id, owner: context.user._id });
    if (!module) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    const body = (input as any) ?? {};

    if (typeof body.name === "string") {
        const trimmed = body.name.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed) {
            throw new ORPCError("BAD_REQUEST", { status: 400, message: "Name can't be empty" });
        }
        module.name = trimmed;
    }

    if (typeof body.active === "boolean") {
        module.active = body.active;
    }

    if (body.nodes !== undefined) {
        const nodes = sanitizeNodes(body.nodes);
        const nodeIds = new Set(nodes.map((n) => n.id));
        module.nodes = nodes;
        // Edges only make sense together with the nodes they reference, so
        // whenever nodes are replaced, edges get re-validated against the
        // new set too (an omitted `edges` field is treated as "no edges").
        module.edges = sanitizeEdges(body.edges ?? [], nodeIds);
    } else if (body.edges !== undefined) {
        const nodeIds = new Set(module.nodes.map((n: any) => n.id));
        module.edges = sanitizeEdges(body.edges, nodeIds);
    }

    await module.save();
    return serializeModule(module);
});

export const remove = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    await connectDB();
    const result = await Module.deleteOne({ _id: id, owner: context.user._id });
    if (result.deletedCount === 0) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Module not found" });
    }

    return { ok: true };
});