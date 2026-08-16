// Never trust a schema or a document's data blindly just because it round
// -tripped through the browser — these are the single source of truth for
// what counts as a valid field / valid data for that field, used by both
// app/router/lists.ts (schema) and app/router/listDocuments.ts (data).

import type { IListField, ListFieldType } from "./models/List";

export const MAX_FIELDS = 40;
export const MAX_LABEL_LENGTH = 80;
export const MAX_TEXT_LENGTH = 5000;
export const MAX_OPTIONS = 40;

const FIELD_TYPES = new Set<ListFieldType>(["text", "number", "boolean", "date", "select"]);
const KEY_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function sanitizeFields(fields: unknown): IListField[] {
    if (!Array.isArray(fields)) return [];
    const seen = new Set<string>();
    const out: IListField[] = [];

    for (const raw of fields) {
        if (out.length >= MAX_FIELDS) break;
        if (!raw || typeof raw !== "object") continue;

        const key = String((raw as any).key ?? "").trim();
        const label = String((raw as any).label ?? "").trim().slice(0, MAX_LABEL_LENGTH);
        const type = (raw as any).type as ListFieldType;

        if (!KEY_RE.test(key) || seen.has(key) || !label || !FIELD_TYPES.has(type)) continue;
        seen.add(key);

        const field: IListField = { key, label, type };
        if (type === "select") {
            const options = Array.isArray((raw as any).options) ? (raw as any).options : [];
            field.options = options
                .map((o: unknown) => String(o).trim().slice(0, MAX_LABEL_LENGTH))
                .filter(Boolean)
                .slice(0, MAX_OPTIONS);
        }
        if ((raw as any).unique === true) field.unique = true;
        out.push(field);
    }

    return out;
}

// The subset of a list's schema that a document write needs to be checked
// against for duplicates — see lib-server/listUnique.ts, which is what
// actually queries for a conflicting document. Kept here next to
// sanitizeFields since both read the same `unique` flag off a field.
export function uniqueFields(fields: IListField[]): IListField[] {
    return fields.filter((f) => f.unique);
}

// Only keeps data for keys that exist in the list's current schema, and
// coerces each value into a shape that matches its field's type. A field
// that's missing, invalid, or was removed from the schema since the
// document was last saved is simply dropped rather than erroring.
export function sanitizeDocumentData(fields: IListField[], data: unknown): Record<string, any> {
    if (!data || typeof data !== "object") return {};
    const out: Record<string, any> = {};

    for (const field of fields) {
        if (!(field.key in (data as any))) continue;
        const raw = (data as any)[field.key];

        switch (field.type) {
            case "number": {
                const n = Number(raw);
                if (Number.isFinite(n)) out[field.key] = n;
                break;
            }
            case "boolean":
                out[field.key] = Boolean(raw);
                break;
            case "select": {
                const value = String(raw ?? "");
                if (field.options?.includes(value)) out[field.key] = value;
                break;
            }
            case "date":
            case "text":
            default:
                out[field.key] = String(raw ?? "").slice(0, MAX_TEXT_LENGTH);
        }
    }

    return out;
}