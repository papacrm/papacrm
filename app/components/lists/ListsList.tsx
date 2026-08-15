"use client";

import { useEffect, useState } from "react";
import { useRouter, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import type { ListSummary } from "@/app/lib/listTypes";

export default function ListsList() {
    const router = useRouter();
    const [lists, setLists] = useState<ListSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function load() {
        try {
            const data = await withAuthRetry(() => orpc.list.list());
            setLists(data as ListSummary[]);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't load lists.");
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setCreating(true);
        try {
            const created = await withAuthRetry(() => orpc.list.create({ name: newName.trim() || "Untitled list", fields: [] }));
            router.push(`/d/lists/${(created as any)._id}`);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't create the list.");
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this list and all of its documents? This can't be undone.")) return;
        setDeletingId(id);
        setError(null);
        try {
            await withAuthRetry(() => orpc.list.remove({ id }));
            setLists((prev) => (prev ? prev.filter((l) => l._id !== id) : prev));
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't delete the list.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Lists</h1>
                <p className="mt-1 text-sm text-neutral-500">Define a custom schema, then add and edit documents that follow it.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">New list</CardTitle>
                    <CardDescription>Give it a name — you'll design its fields next, in the editor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Contacts" disabled={creating} />
                        <Button type="submit" disabled={creating} className="shrink-0">
                            {creating ? "Creating…" : "Create"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {lists === null ? (
                <p className="text-sm text-neutral-500">Loading…</p>
            ) : lists.length === 0 ? (
                <p className="text-sm text-neutral-500">No lists yet — create one above to get started.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {lists.map((l) => (
                        <li key={l._id}>
                            <Card>
                                <CardContent className="flex items-center justify-between gap-4 p-4">
                                    <Link href={`/d/lists/${l._id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="truncate text-sm font-medium text-neutral-900">{l.name}</span>
                                        <span className="text-xs text-neutral-500">
                                            {l.fields.length} field{l.fields.length === 1 ? "" : "s"} · {l.documentCount} document
                                            {l.documentCount === 1 ? "" : "s"}
                                        </span>
                                    </Link>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Link href={`/d/lists/${l._id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                            Edit
                                        </Link>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={deletingId === l._id}
                                            onClick={() => handleDelete(l._id)}
                                        >
                                            {deletingId === l._id ? "Deleting…" : "Delete"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
