import { ORPCError } from "@orpc/server";
import { authed } from "../../lib/orpc/auth";
import { connectDB } from "../../lib/mongoose";
import Workflow from "../../lib/models/Workflow";
import { STEP_EXECUTORS } from "../../lib/steps";

// Derived from the step registry (lib/steps) rather than hand-listed here —
// a type only has to be registered once, in lib/steps/index.ts, to be
// accepted everywhere, including on save.
const NODE_TYPES = new Set(Object.keys(STEP_EXECUTORS));
const MAX_NAME_LENGTH = 120;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function serializeWorkflow(doc: any) {
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
    const workflows = await Workflow.find({ owner: context.user._id }).sort({ updatedAt: -1 }).lean();
    return workflows.map(serializeWorkflow);
});

// Backs the Call step's "another workflow" picker in the editor. Only
// workflows that (a) have no Webhook step at all — those are treated as
// request-handling workflows, not callable function libraries — and (b)
// have at least one *public* Function step are returned, and only the
// public functions are listed for each. Private functions never leave the
// server via this endpoint.
export const listCallable = authed.handler(async ({ context }) => {
    await connectDB();
    const workflows = await Workflow.find({ owner: context.user._id }).select("name nodes").lean();

    return workflows
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

// Backs the Route and Forward steps' "webhook to target" picker. Flat list
// of every Webhook step across the person's own workflows — Function steps
// are never included, since those two steps are specifically about
// jumping to another *URL-triggered* entry point, not calling a function.
export const listWebhooks = authed.handler(async ({ context }) => {
    await connectDB();
    const workflows = await Workflow.find({ owner: context.user._id }).select("name nodes").lean();

    return workflows.flatMap((w) =>
        ((w as any).nodes ?? [])
            .filter((n: any) => n.type === "webhook")
            .map((n: any) => ({
                workflowId: String(w._id),
                workflowName: w.name as string,
                nodeId: n.id as string,
                path: String(n.data?.path || ""),
                method: String(n.data?.method || "GET"),
            })),
    );
});

export const get = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    await connectDB();
    const workflow = await Workflow.findOne({ _id: id, owner: context.user._id }).lean();
    if (!workflow) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    return serializeWorkflow(workflow);
});

export const create = authed.handler(async ({ input, context }) => {
    const name = String((input as any)?.name ?? "").trim().slice(0, MAX_NAME_LENGTH) || "Untitled workflow";

    await connectDB();
    const workflow = await Workflow.create({ owner: context.user._id, name, nodes: [], edges: [], active: false });
    return serializeWorkflow(workflow);
});

export const update = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    await connectDB();
    const workflow = await Workflow.findOne({ _id: id, owner: context.user._id });
    if (!workflow) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    const body = (input as any) ?? {};

    if (typeof body.name === "string") {
        const trimmed = body.name.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed) {
            throw new ORPCError("BAD_REQUEST", { status: 400, message: "Name can't be empty" });
        }
        workflow.name = trimmed;
    }

    if (typeof body.active === "boolean") {
        workflow.active = body.active;
    }

    if (body.nodes !== undefined) {
        const nodes = sanitizeNodes(body.nodes);
        const nodeIds = new Set(nodes.map((n) => n.id));
        workflow.nodes = nodes;
        // Edges only make sense together with the nodes they reference, so
        // whenever nodes are replaced, edges get re-validated against the
        // new set too (an omitted `edges` field is treated as "no edges").
        workflow.edges = sanitizeEdges(body.edges ?? [], nodeIds);
    } else if (body.edges !== undefined) {
        const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
        workflow.edges = sanitizeEdges(body.edges, nodeIds);
    }

    await workflow.save();
    return serializeWorkflow(workflow);
});

export const remove = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    await connectDB();
    const result = await Workflow.deleteOne({ _id: id, owner: context.user._id });
    if (result.deletedCount === 0) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Workflow not found" });
    }

    return { ok: true };
});