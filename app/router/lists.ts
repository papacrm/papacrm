import { ORPCError } from "@orpc/server";
import { authed } from "../../lib/orpc/auth";
import { connectDB } from "../../lib/mongoose";
import List from "../../lib/models/List";
import ListDocument from "../../lib/models/ListDocument";
import { sanitizeFields } from "../../lib/listValidation";

const MAX_NAME_LENGTH = 120;
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function serializeList(doc: any) {
    return {
        _id: String(doc._id),
        name: doc.name as string,
        fields: (doc.fields ?? []).map((f: any) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            options: f.options ?? undefined,
        })),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    };
}

export const list = authed.handler(async ({ context }) => {
    await connectDB();
    const lists = await List.find({ owner: context.user._id }).sort({ updatedAt: -1 }).lean();
    // A plain N+1 count per list — fine at the scale a hand-rolled admin
    // list view like this runs at; swap for an aggregate $lookup if this
    // ever needs to handle hundreds of lists per user.
    return Promise.all(
        lists.map(async (doc) => ({
            ...serializeList(doc),
            documentCount: await ListDocument.countDocuments({ list: doc._id }),
        })),
    );
});

export const get = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    await connectDB();
    const doc = await List.findOne({ _id: id, owner: context.user._id }).lean();
    if (!doc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    return serializeList(doc);
});

export const create = authed.handler(async ({ input, context }) => {
    const name = String((input as any)?.name ?? "").trim().slice(0, MAX_NAME_LENGTH) || "Untitled list";
    const fields = sanitizeFields((input as any)?.fields ?? []);

    await connectDB();
    const doc = await List.create({ owner: context.user._id, name, fields });
    return serializeList(doc);
});

export const update = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    await connectDB();
    const doc = await List.findOne({ _id: id, owner: context.user._id });
    if (!doc) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    const body = (input as any) ?? {};

    if (typeof body.name === "string") {
        const trimmed = body.name.trim().slice(0, MAX_NAME_LENGTH);
        if (!trimmed) {
            throw new ORPCError("BAD_REQUEST", { status: 400, message: "Name can't be empty" });
        }
        doc.name = trimmed;
    }

    if (body.fields !== undefined) {
        // Note: this doesn't retroactively touch existing documents — a
        // field removed from the schema just stops showing up (its data
        // stays in Mongo but is filtered out by sanitizeDocumentData the
        // next time that document is saved), and a renamed key is treated
        // as a brand new field rather than a rename.
        doc.fields = sanitizeFields(body.fields);
    }

    await doc.save();
    return serializeList(doc);
});

export const remove = authed.handler(async ({ input, context }) => {
    const id = String((input as any)?.id ?? "");
    if (!OBJECT_ID_RE.test(id)) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    await connectDB();
    const result = await List.deleteOne({ _id: id, owner: context.user._id });
    if (result.deletedCount === 0) {
        throw new ORPCError("NOT_FOUND", { status: 404, message: "List not found" });
    }

    // Cascade: a list's documents are meaningless without their list.
    await ListDocument.deleteMany({ list: id, owner: context.user._id });

    return { ok: true };
});
