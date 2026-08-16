// A list's documents live in `data`, a schemaless Mixed blob (see
// models/ListDocument.ts), so uniqueness can't be a real Mongo unique
// index the way it is on e.g. User.email — the set of keys is whatever
// the list's own field schema says it is today, and that schema can
// change at any time. Instead, every place that writes a document's data
// (app/router/listDocuments.ts, and the module-engine nodes that save
// into a list — saveToList.ts, updateOne.ts) calls findUniqueFieldConflict
// right before the write and treats a hit the same way they'd treat any
// other "can't do that" case for their surface: the router throws a
// CONFLICT the person sees as a form error, a workflow node skips quietly
// the same way it already does for "nothing to save to".
import ListDocument from "./models/ListDocument";
import { uniqueFields } from "./listValidation";
import type { IListField } from "./models/List";

// The first field (in schema order) whose value in `data` is already used
// by another document in the same list, or null if every unique field is
// clear. An empty string / null / undefined value never conflicts — an
// unfilled unique field shouldn't block every other document that also
// hasn't filled it in yet, same "empty means unset" treatment the rest of
// list validation gives blank values.
export async function findUniqueFieldConflict(
    fields: IListField[],
    data: Record<string, any>,
    listId: unknown,
    owner: unknown,
    excludeId?: unknown,
): Promise<IListField | null> {
    for (const field of uniqueFields(fields)) {
        if (!(field.key in data)) continue;
        const value = data[field.key];
        if (value === undefined || value === null || value === "") continue;

        const query: Record<string, any> = { list: listId, owner, [`data.${field.key}`]: value };
        if (excludeId) query._id = { $ne: excludeId };

        const existing = await ListDocument.findOne(query).select("_id").lean();
        if (existing) return field;
    }
    return null;
}
