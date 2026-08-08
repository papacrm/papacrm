// Kept in sync with lib/models/List.ts on the server side — that's the
// source of truth for what's actually allowed to be saved (see
// lib/listValidation.ts). This file is what the editor UI reads from.

export type ListFieldType = "text" | "number" | "boolean" | "date" | "select";

export interface ListField {
    key: string;
    label: string;
    type: ListFieldType;
    options?: string[];
}

export interface ListSummary {
    _id: string;
    name: string;
    fields: ListField[];
    documentCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface ListDocumentRecord {
    _id: string;
    list: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface ListDocumentPage {
    documents: ListDocumentRecord[];
    total: number;
    page: number;
    pageSize: number;
}

export type SortDir = "asc" | "desc";

// "createdAt" / "updatedAt" plus any of the list's own field keys.
export type SortKey = string;

export const FIELD_TYPES: { value: ListFieldType; label: string; description: string }[] = [
    { value: "text", label: "Text", description: "A short line of text" },
    { value: "number", label: "Number", description: "A number" },
    { value: "boolean", label: "Yes / No", description: "A checkbox" },
    { value: "date", label: "Date", description: "A calendar date" },
    { value: "select", label: "Select", description: "One of a fixed set of options" },
];

// Suggests the next unused "fieldN" key when a person adds a field without
// typing one — kept short and always valid so it never needs sanitizing.
export function nextFieldKey(existing: ListField[]): string {
    const used = new Set(existing.map((f) => f.key));
    let n = existing.length + 1;
    let key = `field${n}`;
    while (used.has(key)) {
        n++;
        key = `field${n}`;
    }
    return key;
}

export function defaultValueForField(field: ListField): any {
    switch (field.type) {
        case "boolean":
            return false;
        case "select":
            return field.options?.[0] ?? "";
        case "number":
        case "date":
        case "text":
        default:
            return "";
    }
}