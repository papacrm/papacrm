"use client";

import { useEffect, useState } from "react";
import { useRequest, useRouter, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";

interface LocalModuleData {
    id: string;
    name: string;
    active: boolean;
    nodes: unknown[];
    edges: unknown[];
    isDev: boolean;
}

// A raw JSON editor for nodes/edges rather than the full drag-and-drop
// canvas in ModuleEditor.tsx — local modules are meant for a handful of
// small, mostly-static bootstrap flows (see app/lib-server/localModules.ts),
// so this keeps things simple: paste/edit the graph as JSON (same shape
// the Export button on a regular module already produces), toggle active,
// save. Every write still goes through the same sanitizeNodes/
// sanitizeEdges validation as the DB-backed editor (see
// app/router/localModules.ts) — this is just a friendlier place to catch
// a JSON typo before that.
export default function LocalModuleEditor() {
    const { params } = useRequest();
    const router = useRouter();
    const id = String(params.id ?? "");

    const [data, setData] = useState<LocalModuleData | null>(null);
    const [name, setName] = useState("");
    const [active, setActive] = useState(false);
    const [graphText, setGraphText] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const m = (await withAuthRetry(() => orpc.localModule.get({ id }))) as LocalModuleData;
                if (cancelled) return;
                setData(m);
                setName(m.name);
                setActive(m.active);
                setGraphText(JSON.stringify({ nodes: m.nodes, edges: m.edges }, null, 2));
            } catch (err) {
                if (!cancelled) setError(err instanceof ORPCError && err.status === 404 ? "Local module not found." : "Couldn't load this local module.");
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    async function handleSave() {
        setError(null);
        let graph: { nodes: unknown; edges: unknown };
        try {
            graph = JSON.parse(graphText);
        } catch {
            setError("Nodes/edges must be valid JSON.");
            return;
        }
        setSaving(true);
        try {
            await withAuthRetry(() => orpc.localModule.update({ id, name, active, nodes: graph.nodes, edges: graph.edges }));
            await withAuthRetry(async () => {
                const m = (await orpc.localModule.get({ id })) as LocalModuleData;
                setData(m);
                setGraphText(JSON.stringify({ nodes: m.nodes, edges: m.edges }, null, 2));
            });
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't save this local module.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Delete this local module file? This can't be undone.")) return;
        setDeleting(true);
        setError(null);
        try {
            await withAuthRetry(() => orpc.localModule.remove({ id }));
            router.push("/d/local-modules");
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't delete this local module.");
            setDeleting(false);
        }
    }

    if (error && !data) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-neutral-500">{error}</p>
                <Link href="/d/local-modules" className="text-sm font-medium text-neutral-900 underline underline-offset-4">
                    Back to local modules
                </Link>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-sm text-neutral-500">Loading…</p>
            </div>
        );
    }

    const readOnly = !data.isDev;

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Link href="/d/local-modules" className="text-xs text-neutral-500 underline underline-offset-4">
                        ← Local modules
                    </Link>
                    <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">app/local-modules/{data.id}.json</h1>
                </div>
                {!readOnly && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deleting} onClick={handleDelete}>
                        {deleting ? "Deleting…" : "Delete"}
                    </Button>
                )}
            </div>

            {readOnly && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Running in production mode — this local module is read-only. It was fixed at publish time; switch to dev mode to
                    change it.
                </p>
            )}

            <div className="flex flex-col gap-2">
                <Label htmlFor="lm-name">Name</Label>
                <Input id="lm-name" value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 p-3">
                <div>
                    <p className="text-sm font-medium text-neutral-900">Active</p>
                    <p className="text-xs text-neutral-500">Only active modules' webhook nodes are matched against incoming requests.</p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} disabled={readOnly} aria-label="Active" />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="lm-graph">Nodes &amp; edges (JSON)</Label>
                <Textarea
                    id="lm-graph"
                    value={graphText}
                    onChange={(e) => setGraphText(e.target.value)}
                    disabled={readOnly}
                    className="min-h-[420px] font-mono text-xs"
                    spellCheck={false}
                />
                <p className="text-xs text-neutral-500">
                    Same shape as a module's Export file: <code>{"{ \"nodes\": [...], \"edges\": [...] }"}</code>. Unrecognised node types
                    or dangling edges are dropped on save.
                </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!readOnly && (
                <div>
                    <Button type="button" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            )}
        </div>
    );
}
