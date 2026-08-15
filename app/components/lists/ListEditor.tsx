"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import { Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import DocumentEditor from "./DocumentEditor";
import {
    FIELD_TYPES,
    nextFieldKey,
    defaultValueForField,
    type ListField,
    type ListSummary,
    type ListDocumentRecord,
    type SortDir,
} from "@/app/lib/listTypes";

const SELECT_CLASS =
    "flex h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PAGE_SIZE = 10;

function emptyDataFor(fields: ListField[]): Record<string, any> {
    return Object.fromEntries(fields.map((f) => [f.key, defaultValueForField(f)]));
}

function formatCell(field: ListField, raw: any): string {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (field.type === "boolean") return raw ? "Yes" : "No";
    return String(raw);
}

export default function ListEditor({ list }: { list: ListSummary }) {
    const [name, setName] = useState(list.name);
    const [fields, setFields] = useState<ListField[]>(list.fields);
    const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ name: list.name, fields: list.fields }));
    const [savingSchema, setSavingSchema] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);

    const [documents, setDocuments] = useState<ListDocumentRecord[] | null>(null);
    const [total, setTotal] = useState(0);
    const [documentsError, setDocumentsError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [newDocData, setNewDocData] = useState<Record<string, any>>({});
    const [savingNew, setSavingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDocData, setEditDocData] = useState<Record<string, any>>({});
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [sortKey, setSortKey] = useState("createdAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [filterKey, setFilterKey] = useState("");
    const [filterValue, setFilterValue] = useState("");

    const dirty = JSON.stringify({ name, fields }) !== savedSnapshot;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const filterField = fields.find((f) => f.key === filterKey) ?? null;
    // Belt-and-suspenders: documents is always set to an array by
    // loadDocuments, but the render path derives from this rather than
    // `documents` directly so a malformed state value can never reach
    // .map and crash the page.
    const rows = Array.isArray(documents) ? documents : [];

    async function loadDocuments() {
        try {
            const data = await withAuthRetry(() =>
                orpc.list.document.list({ listId: list._id, page, pageSize: PAGE_SIZE, sortKey, sortDir, filterKey, filterValue }),
            );
            // Tolerates the old handler's bare-array response too, in case
            // the frontend and backend ever end up deployed a node apart.
            if (Array.isArray(data)) {
                setDocuments(data as ListDocumentRecord[]);
                setTotal((data as ListDocumentRecord[]).length);
            } else {
                const result = data as { documents: ListDocumentRecord[]; total: number };
                setDocuments(Array.isArray(result?.documents) ? result.documents : []);
                setTotal(typeof result?.total === "number" ? result.total : 0);
            }
        } catch (err) {
            setDocumentsError(err instanceof ORPCError ? err.message : "Couldn't load documents.");
        }
    }

    useEffect(() => {
        loadDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [list._id, page, sortKey, sortDir]);

    // Filter value changes debounce so we're not firing a request per
    // keystroke; jumps back to page 1 since the result set shape changes.
    // Skips its first run — the [list._id, page, sortKey, sortDir] effect
    // above already covers the initial load.
    const skippedFirstFilterRun = useRef(false);
    useEffect(() => {
        if (!skippedFirstFilterRun.current) {
            skippedFirstFilterRun.current = true;
            return;
        }
        setPage(1);
        const timeout = setTimeout(loadDocuments, 300);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey, filterValue]);

    function toggleSort(key: string) {
        setPage(1);
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    }

    function addField() {
        setFields((prev) => [...prev, { key: nextFieldKey(prev), label: "New field", type: "text" }]);
    }

    function updateField(index: number, patch: Partial<ListField>) {
        setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    }

    function removeField(index: number) {
        setFields((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSaveSchema() {
        setSchemaError(null);
        setSavingSchema(true);
        try {
            const updated = await withAuthRetry(() => orpc.list.update({ id: list._id, name, fields }));
            const saved = updated as ListSummary;
            setName(saved.name);
            setFields(saved.fields);
            setSavedSnapshot(JSON.stringify({ name: saved.name, fields: saved.fields }));
        } catch (err) {
            setSchemaError(err instanceof ORPCError ? err.message : "Couldn't save changes.");
        } finally {
            setSavingSchema(false);
        }
    }

    function openCreate() {
        setNewDocData(emptyDataFor(fields));
        setEditingId(null);
        setCreating(true);
    }

    async function handleCreateDocument(e: React.FormEvent) {
        e.preventDefault();
        setSavingNew(true);
        setDocumentsError(null);
        try {
            await withAuthRetry(() => orpc.list.document.create({ listId: list._id, data: newDocData }));
            setCreating(false);
            await loadDocuments();
        } catch (err) {
            setDocumentsError(err instanceof ORPCError ? err.message : "Couldn't create the document.");
        } finally {
            setSavingNew(false);
        }
    }

    function openEdit(doc: ListDocumentRecord) {
        setCreating(false);
        setEditingId(doc._id);
        setEditDocData({ ...emptyDataFor(fields), ...doc.data });
    }

    async function handleUpdateDocument(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId) return;
        setSavingEdit(true);
        setDocumentsError(null);
        try {
            await withAuthRetry(() => orpc.list.document.update({ id: editingId, data: editDocData }));
            setEditingId(null);
            await loadDocuments();
        } catch (err) {
            setDocumentsError(err instanceof ORPCError ? err.message : "Couldn't save the document.");
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleDeleteDocument(id: string) {
        if (!confirm("Delete this document? This can't be undone.")) return;
        setDeletingId(id);
        setDocumentsError(null);
        try {
            await withAuthRetry(() => orpc.list.document.remove({ id }));
            if (editingId === id) setEditingId(null);
            if (rows.length === 1 && page > 1) {
                setPage((p) => p - 1); // triggers reload via the page effect
            } else {
                await loadDocuments();
            }
        } catch (err) {
            setDocumentsError(err instanceof ORPCError ? err.message : "Couldn't delete the document.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <Link href="/d/lists" className="text-xs font-medium text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
                        ← Back to lists
                    </Link>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">{name || "Untitled list"}</h1>
                </div>
                <Button onClick={handleSaveSchema} disabled={!dirty || savingSchema}>
                    {savingSchema ? "Saving…" : dirty ? "Save changes" : "Saved"}
                </Button>
            </div>

            {schemaError && <p className="text-sm text-destructive">{schemaError}</p>}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Name</CardTitle>
                </CardHeader>
                <CardContent>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="List name" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Schema</CardTitle>
                    <CardDescription>
                        Fields define what a document in this list looks like. Removing or renaming a field doesn't delete existing document data, it
                        just stops showing it.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {fields.length === 0 && <p className="text-sm text-neutral-500">No fields yet — add one below.</p>}
                    {fields.map((field, index) => (
                        <div key={index} className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3 sm:flex-row sm:items-center">
                            <div className="flex flex-1 flex-col gap-1">
                                <Label className="text-xs text-neutral-500">Label</Label>
                                <Input
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder="Field label"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs text-neutral-500">Key</Label>
                                <Input
                                    value={field.key}
                                    onChange={(e) => updateField(index, { key: e.target.value })}
                                    placeholder="field_key"
                                    className="sm:w-32"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs text-neutral-500">Type</Label>
                                <select
                                    value={field.type}
                                    onChange={(e) => updateField(index, { type: e.target.value as ListField["type"] })}
                                    className={SELECT_CLASS}
                                >
                                    {FIELD_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {field.type === "select" && (
                                <div className="flex flex-1 flex-col gap-1">
                                    <Label className="text-xs text-neutral-500">Options (comma-separated)</Label>
                                    <Input
                                        value={(field.options ?? []).join(", ")}
                                        onChange={(e) =>
                                            updateField(index, {
                                                options: e.target.value
                                                    .split(",")
                                                    .map((o) => o.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                        placeholder="Option A, Option B"
                                    />
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive sm:self-end"
                                onClick={() => removeField(index)}
                            >
                                Remove
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={addField}>
                        + Add field
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                    <div>
                        <CardTitle className="text-base">Documents</CardTitle>
                        <CardDescription>{fields.length === 0 ? "Add a field above to start adding documents." : "Rows in this list."}</CardDescription>
                    </div>
                    <Button type="button" size="sm" disabled={fields.length === 0} onClick={openCreate}>
                        + Add document
                    </Button>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {documentsError && <p className="text-sm text-destructive">{documentsError}</p>}

                    {fields.length > 0 && (
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs text-neutral-500">Filter by</Label>
                                <select
                                    value={filterKey}
                                    onChange={(e) => {
                                        setFilterKey(e.target.value);
                                        setFilterValue("");
                                    }}
                                    className={SELECT_CLASS}
                                >
                                    <option value="">No filter</option>
                                    {fields.map((f) => (
                                        <option key={f.key} value={f.key}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {filterField && (
                                <div className="flex flex-col gap-1">
                                    <Label className="text-xs text-neutral-500">Value</Label>
                                    {filterField.type === "boolean" ? (
                                        <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={SELECT_CLASS}>
                                            <option value="">Any</option>
                                            <option value="true">Yes</option>
                                            <option value="false">No</option>
                                        </select>
                                    ) : filterField.type === "select" ? (
                                        <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={SELECT_CLASS}>
                                            <option value="">Any</option>
                                            {(filterField.options ?? []).map((opt) => (
                                                <option key={opt} value={opt}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <Input
                                            value={filterValue}
                                            onChange={(e) => setFilterValue(e.target.value)}
                                            placeholder={filterField.type === "number" ? "e.g. 42" : "Contains…"}
                                            className="h-9"
                                        />
                                    )}
                                </div>
                            )}
                            {(filterKey || filterValue) && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setFilterKey("");
                                        setFilterValue("");
                                    }}
                                >
                                    Clear filter
                                </Button>
                            )}
                        </div>
                    )}

                    {creating && (
                        <form onSubmit={handleCreateDocument} className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
                            <DocumentEditor fields={fields} value={newDocData} onChange={(key, v) => setNewDocData((prev) => ({ ...prev, [key]: v }))} />
                            <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={savingNew}>
                                    {savingNew ? "Saving…" : "Save document"}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {documents === null ? (
                        <p className="text-sm text-neutral-500">Loading…</p>
                    ) : rows.length === 0 ? (
                        <p className="text-sm text-neutral-500">{filterKey && filterValue ? "No documents match this filter." : "No documents yet."}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-max text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                        {fields.map((field) => (
                                            <th key={field.key} className="whitespace-nowrap px-2 py-2 font-medium">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort(field.key)}
                                                    className="inline-flex items-center gap-1 hover:text-neutral-900"
                                                >
                                                    {field.label}
                                                    {sortKey === field.key && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-2 py-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleSort("createdAt")}
                                                className="inline-flex items-center gap-1 font-medium hover:text-neutral-900"
                                            >
                                                Created
                                                {sortKey === "createdAt" && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                                            </button>
                                        </th>
                                        <th className="px-2 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((doc) => (
                                        <Fragment key={doc._id}>
                                            <tr className="border-b border-neutral-100">
                                                {fields.map((field) => (
                                                    <td key={field.key} className="whitespace-nowrap px-2 py-2 text-neutral-700">
                                                        {formatCell(field, doc.data[field.key])}
                                                    </td>
                                                ))}
                                                <td className="whitespace-nowrap px-2 py-2 text-neutral-500">
                                                    {new Date(doc.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="whitespace-nowrap px-2 py-2 text-right">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        disabled={deletingId === doc._id}
                                                        onClick={() => handleDeleteDocument(doc._id)}
                                                    >
                                                        {deletingId === doc._id ? "Deleting…" : "Delete"}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {editingId === doc._id && (
                                                <tr>
                                                    <td colSpan={fields.length + 2} className="bg-neutral-50 px-2 py-4">
                                                        <form onSubmit={handleUpdateDocument} className="flex flex-col gap-4">
                                                            <DocumentEditor
                                                                fields={fields}
                                                                value={editDocData}
                                                                onChange={(key, v) => setEditDocData((prev) => ({ ...prev, [key]: v }))}
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button type="submit" size="sm" disabled={savingEdit}>
                                                                    {savingEdit ? "Saving…" : "Save"}
                                                                </Button>
                                                                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {documents !== null && total > 0 && (
                        <div className="flex items-center justify-between gap-4 text-xs text-neutral-500">
                            <span>
                                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    Previous
                                </Button>
                                <span>
                                    Page {page} of {totalPages}
                                </span>
                                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}