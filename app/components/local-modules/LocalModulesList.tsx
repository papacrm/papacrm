"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";

interface LocalModuleSummary {
    id: string;
    name: string;
    active: boolean;
    nodes: unknown[];
}

export default function LocalModulesList() {
    const [modules, setModules] = useState<LocalModuleSummary[] | null>(null);
    const [isDev, setIsDev] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newId, setNewId] = useState("");
    const [creating, setCreating] = useState(false);
    const [importing, setImporting] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);

    async function load() {
        try {
            const data = (await withAuthRetry(() => orpc.localModule.list())) as { isDev: boolean; modules: LocalModuleSummary[] };
            setModules(data.modules);
            setIsDev(data.isDev);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't load local modules.");
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
            const id = newId.trim();
            await withAuthRetry(() => orpc.localModule.create({ id, name: id, nodes: [], edges: [] }));
            setNewId("");
            await load();
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't create the local module.");
        } finally {
            setCreating(false);
        }
    }

    function handleImportClick() {
        importInputRef.current?.click();
    }

    // Same shape as the DB-backed Import (ModulesList.tsx): reads a
    // previously-exported module JSON file and creates a new *local*
    // module from it. The id used on disk is derived from the file name
    // since local modules are keyed by id/filename, not by an ObjectId.
    async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setError(null);
        setImporting(true);
        try {
            const text = await file.text();
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch {
                throw new Error("That file isn't valid JSON.");
            }
            if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
                throw new Error('That doesn\'t look like an exported module — expected an object with a "nodes" array.');
            }

            const suggestedId = file.name.replace(/\.json$/i, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-").slice(0, 64) || "module";

            await withAuthRetry(() =>
                orpc.localModule.create({
                    id: suggestedId,
                    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : suggestedId,
                    nodes: parsed.nodes,
                    edges: Array.isArray(parsed.edges) ? parsed.edges : [],
                }),
            );
            await load();
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : err instanceof Error ? err.message : "Couldn't import that file.");
        } finally {
            setImporting(false);
        }
    }

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Local Modules</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        Loaded from JSON files in <code className="rounded bg-neutral-100 px-1 py-0.5">app/local-modules</code>, checked
                        before the database on every webhook request. They're bundled into the app at publish time — after that, they
                        can only be changed in dev mode.
                    </p>
                </div>
                {modules && isDev && (
                    <div className="shrink-0">
                        <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
                            {importing ? "Importing…" : "Import"}
                        </Button>
                    </div>
                )}
            </div>

            {modules && !isDev && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Running in production mode — local modules are read-only here. Switch to dev mode to add, edit, or delete them.
                </p>
            )}

            {modules && isDev && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">New local module</CardTitle>
                        <CardDescription>
                            Pick an id (becomes the filename, e.g. "welcome" → app/local-modules/welcome.json). Build it out from the
                            editor afterwards, or use Import above to start from an exported module.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="flex gap-2">
                            <Input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g. welcome" disabled={creating} />
                            <Button type="submit" disabled={creating || !newId.trim()} className="shrink-0">
                                {creating ? "Creating…" : "Create"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {modules === null ? (
                <p className="text-sm text-neutral-500">Loading…</p>
            ) : modules.length === 0 ? (
                <p className="text-sm text-neutral-500">No local modules yet{isDev ? " — create one above to get started." : "."}</p>
            ) : (
                <ul className="flex flex-col gap-3">
                    {modules.map((module) => (
                        <li key={module.id}>
                            <Card>
                                <CardContent className="flex items-center justify-between gap-4 p-4">
                                    <Link href={`/d/local-modules/${module.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
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
                                    <Link href={`/d/local-modules/${module.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                                        {isDev ? "Edit" : "View"}
                                    </Link>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
