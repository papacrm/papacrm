"use client";

import { useEffect, useState } from "react";
import { useRequest, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import ModuleEditor from "@/app/components/modules/ModuleEditor";
import type { ModuleEdge, ModuleNode } from "@/app/lib/moduleTypes";

interface LocalModuleData {
    id: string;
    name: string;
    active: boolean;
    nodes: ModuleNode[];
    edges: ModuleEdge[];
    isDev: boolean;
}

// Same drag-and-drop canvas as the DB-backed editor (ModuleEditorLoader.tsx)
// — local modules are just a different save/delete target and, outside dev
// mode, read-only (see ModuleEditor's `kind`/`readOnly` props and
// app/router/localModules.ts's requireDev()).
export default function LocalModuleEditorLoader() {
    const { params } = useRequest();
    const id = String(params.id ?? "");

    const [data, setData] = useState<LocalModuleData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const m = await withAuthRetry(() => orpc.localModule.get({ id }));
                if (!cancelled) setData(m as LocalModuleData);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ORPCError && err.status === 404 ? "Local module not found." : "Couldn't load this local module.");
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (error) {
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

    return (
        <ModuleEditor
            module={{ _id: data.id, name: data.name, active: data.active, nodes: data.nodes, edges: data.edges }}
            kind="local"
            backHref="/d/local-modules"
            readOnly={!data.isDev}
        />
    );
}
