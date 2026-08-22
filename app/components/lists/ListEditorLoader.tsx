"use client";

import { useEffect, useState } from "react";
import { useRequest, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import ListEditor from "./ListEditor";
import type { ListSummary } from "@/app/lib/listTypes";

export default function ListEditorLoader() {
    const { params } = useRequest();
    const id = String(params.id ?? "");

    const [list, setList] = useState<ListSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await withAuthRetry(() => orpc.list.get({ id }));
                if (!cancelled) setList(data as ListSummary);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof ORPCError && err.status === 404 ? "List not found." : "Couldn't load this list.");
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
                <Link href="/d/lists" className="text-sm font-medium text-neutral-900 underline underline-offset-4">
                    Back to lists
                </Link>
            </div>
        );
    }

    if (!list) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <p className="text-sm text-neutral-500">Loading…</p>
            </div>
        );
    }

    // key={list._id} forces a full remount when navigating from one
    // list to another (same route component instance otherwise, since
    // only the [id] param changes). Without it, ListEditor's `name` and
    // `fields` state — both seeded once via useState(list...) — never
    // re-initializes for the new list, so the schema editor and the
    // documents table kept rendering the *previous* list's field set
    // against the new list's data, which is what caused the random
    // crashes when switching between lists.
    return <ListEditor key={list._id} list={list} />;
}
