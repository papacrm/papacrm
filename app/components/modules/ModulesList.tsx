"use client";

import { useEffect, useState } from "react";
import { useRouter, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";

interface ModuleSummary {
    _id: string;
    name: string;
    active: boolean;
    nodes: unknown[];
    updatedAt: string;
}

export default function ModulesList() {
    const router = useRouter();
    const [modules, setModules] = useState<ModuleSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function load() {
        try {
            const data = await withAuthRetry(() => orpc.module.list());
            setModules(data as ModuleSummary[]);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't load modules.");
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
            const module = await withAuthRetry(() => orpc.module.create({ name: newName.trim() || "Untitled module" }));
            router.push(`/d/modules/${(module as any)._id}`);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't create the module.");
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this module? This can't be undone.")) return;
        setDeletingId(id);
        setError(null);
        try {
            await withAuthRetry(() => orpc.module.remove({ id }));
            setModules((prev) => (prev ? prev.filter((w) => w._id !== id) : prev));
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't delete the module.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Modules</h1>
                <p className="mt-1 text-sm text-neutral-500">
                    Build automations from a webhook trigger, an HTTP request, a condition, and a static page response.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">New module</CardTitle>
                    <CardDescription>Give it a name — you can rename it later from the editor.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. New signup notification"
                            disabled={creating}
                        />
                        <Button type="submit" disabled={creating} className="shrink-0">
                            {creating ? "Creating…" : "Create"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {modules === null ? (
                <p className="text-sm text-neutral-500">Loading…</p>
            ) : modules.length === 0 ? (
                <p className="text-sm text-neutral-500">No modules yet — create one above to get started.</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {modules.map((module) => (
                        <li key={module._id}>
                            <Card>
                                <CardContent className="flex items-center justify-between gap-4 p-4">
                                    <Link href={`/d/modules/${module._id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="truncate text-sm font-medium text-neutral-900">{module.name}</span>
                                        <span className="text-xs text-neutral-500">
                                            {module.nodes.length} node{module.nodes.length === 1 ? "" : "s"} ·{" "}
                                            {module.active ? (
                                                <span className="font-medium text-emerald-600">Active</span>
                                            ) : (
                                                <span>Inactive</span>
                                            )}
                                        </span>
                                    </Link>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <Link
                                            href={`/d/modules/${module._id}`}
                                            className={buttonVariants({ variant: "outline", size: "sm" })}
                                        >
                                            Edit
                                        </Link>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={deletingId === module._id}
                                            onClick={() => handleDelete(module._id)}
                                        >
                                            {deletingId === module._id ? "Deleting…" : "Delete"}
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
