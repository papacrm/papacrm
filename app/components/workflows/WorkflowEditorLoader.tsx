"use client";

import { useEffect, useState } from "react";
import { useRequest, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import WorkflowEditor from "./WorkflowEditor";
import type { WorkflowEdge, WorkflowNode } from "@/app/lib/workflowTypes";

interface WorkflowData {
    _id: string;
    name: string;
    active: boolean;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export default function WorkflowEditorLoader() {
    const { params } = useRequest();
    const id = String(params.id ?? "");

    const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await withAuthRetry(() => orpc.workflow.get({ id }));
                if (!cancelled) setWorkflow(data as WorkflowData);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ORPCError && err.status === 404 ? "Workflow not found." : "Couldn't load this workflow.");
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
                <Link href="/d/workflows" className="text-sm font-medium text-neutral-900 underline underline-offset-4">
                    Back to workflows
                </Link>
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-sm text-neutral-500">Loading…</p>
            </div>
        );
    }
    
    return <WorkflowEditor workflow={workflow} />;
}
