"use client";

import { useEffect, useState } from "react";
import { useRequest, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import ModuleEditor from "./ModuleEditor";
import type { ModuleEdge, ModuleNode } from "@/app/lib/moduleTypes";

interface ModuleData {
    _id: string;
    name: string;
    active: boolean;
    nodes: ModuleNode[];
    edges: ModuleEdge[];
}

export default function ModuleEditorLoader() {
    const { params } = useRequest();
    const id = String(params.id ?? "");

    const [module, setModule] = useState<ModuleData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await withAuthRetry(() => orpc.module.get({ id }));
                if (!cancelled) setModule(data as ModuleData);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ORPCError && err.status === 404 ? "Module not found." : "Couldn't load this module.");
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
                <Link href="/d/modules" className="text-sm font-medium text-neutral-900 underline underline-offset-4">
                    Back to modules
                </Link>
            </div>
        );
    }

    if (!module) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-sm text-neutral-500">Loading…</p>
            </div>
        );
    }
    
    return <ModuleEditor module={module} />;
}
