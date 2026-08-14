import { ORPCError } from "@orpc/server";
import { authed } from "../lib-server/orpc/auth";
import { connectDB } from "../lib-server/mongoose";
import List from "../lib-server/models/List";
import ListDocument from "../lib-server/models/ListDocument";
import { sanitizeDocumentData } from "../lib-server/listValidation";

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SORTABLE_META_KEYS = new Set(["createdAt", "updatedAt"]);

// Escapes a string for safe use inside a RegExp — a filter value is
// person-typed, so treat it as literal text rather than a pattern.
function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeDocument(doc: any) {
    return {
        _id: String(doc._id),
        list: String(doc.list),
        data: doc.data ?? {},
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    };
}

async function loadOwnedList(id: string, ownerId: string) {
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }
    await connectDB();
    const listDoc = await List.findOne({ _id: id, owner: ownerId }).lean();
    if (!listDoc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }
    return listDoc;
}

export const list = authed.handler(async ({ input, context }) => {
    const listId = String((input as any)?.listId ?? "");
    const listDoc = await loadOwnedList(listId, context.user._id);
    const fields = (listDoc.fields ?? []) as { key: string; type: string; options?: string[] }[];
    const fieldByKey = new Map(fields.map((f) => [f.key, f]));

    const page = Math.max(1, Math.trunc(Number((input as any)?.page)) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number((input as any)?.pageSize)) || DEFAULT_PAGE_SIZE));

    // Sorting: either a schema field's data (data.<key>) or one of the two
    // built-in timestamps — anything else falls back to the default so a
    // stale/tampered sortKey (e.g. a field that was since removed) can't
    // turn into an invalid query.
    const requestedSortKey = String((input as any)?.sortKey ?? "createdAt");
    const sortDir = (input as any)?.sortDir === "asc" ? 1 : -1;
    const sortKey = SORTABLE_META_KEYS.has(requestedSortKey)
        ? requestedSortKey
        : fieldByKey.has(requestedSortKey)
          ? `data.${requestedSortKey}`
          : "createdAt";

    // Filtering: only against a key that's actually in the list's current
    // schema, type-aware so e.g. a number field filters by exact value
    // rather than a substring match. Case-insensitive substring for
    // text/date/select values.
    const filterKey = String((input as any)?.filterKey ?? "");
    const filterValueRaw = String((input as any)?.filterValue ?? "").trim();
    const query: Record<string, any> = { list: listId, owner: context.user._id };
    const filterField = fieldByKey.get(filterKey);

    if (filterField && filterValueRaw) {
        const path = `data.${filterKey}`;
        if (filterField.type === "number") {
            const n = Number(filterValueRaw);
            if (Number.isFinite(n)) query[path] = n;
        } else if (filterField.type === "boolean") {
            query[path] = filterValueRaw === "true";
        } else {
            query[path] = { $regex: escapeRegExp(filterValueRaw), $options: "i" };
        }
    }

    const [docs, total] = await Promise.all([
        ListDocument.find(query)
            .sort({ [sortKey]: sortDir })
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .lean(),
        ListDocument.countDocuments(query),
    ]);

    return { documents: docs.map(serializeDocument), total, page, pageSize };
});

export const get = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    await connectDB();
    const doc = await ListDocument.findOne({ _id: id, owner: context.user._id }).lean();
    if (!doc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    return serializeDocument(doc);
});

export const create = authed.handler(async ({ input, context }) => {
    const listId = String((input as any)?.listId ?? "");
    const listDoc = await loadOwnedList(listId, context.user._id);

    const data = sanitizeDocumentData(listDoc.fields as any, (input as any)?.data ?? {});
    const doc = await ListDocument.create({ list: listId, owner: context.user._id, data });
    return serializeDocument(doc);
});

export const update = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    await connectDB();
    const doc = await ListDocument.findOne({ _id: id, owner: context.user._id });
    if (!doc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    const listDoc = await List.findOne({ _id: doc.list, owner: context.user._id }).lean();
    if (!listDoc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    const body = (input as any) ?? {};
    if (body.data !== undefined) {
        doc.data = sanitizeDocumentData(listDoc.fields as any, body.data);
    }

    await doc.save();
    return serializeDocument(doc);
});

export const remove = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    await connectDB();
    const result = await ListDocument.deleteOne({ _id: id, owner: context.user._id });
    if (result.deletedCount === 0) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "Document not found" });
    }

    return { ok: true };
});