"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { HtmlEditor } from "@/app/components/ui/html-editor";
import { NODE_DEFS, NODE_ORDER, CATEGORY_ORDER, CATEGORY_META, STEP_CATEGORIES, type WorkflowNode, type WorkflowEdge, type WorkflowNodeType, type WorkflowStepCategory } from "@/app/lib/workflowTypes";
import { cn } from "@/app/lib/utils";
import {
    buildClassName,
    TEXT_SIZE_OPTIONS,
    FONT_WEIGHT_OPTIONS,
    TEXT_ALIGN_OPTIONS,
    TEXT_COLOR_OPTIONS,
    BG_COLOR_OPTIONS,
    DIRECTION_OPTIONS,
    ITEMS_ALIGN_OPTIONS,
    JUSTIFY_OPTIONS,
    GAP_OPTIONS,
    PADDING_OPTIONS,
    MARGIN_OPTIONS,
    ROUNDED_OPTIONS,
    SHADOW_OPTIONS,
    WIDTH_OPTIONS,
    type ClassOption,
} from "@/app/lib/tailwindClasses";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 78;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

// Step types that can be dropped into a View's page — see the "Layout"
// section rendered below for a selected View node, and its server-side
// counterpart, EMBEDDABLE_TYPES in app/lib-server/steps/view.ts.
const VIEW_BLOCK_TYPES: WorkflowNodeType[] = ["menu", "tabs", "navbar", "footer", "view", "div", "table", "listView", "card", "inputForm", "staticPage", "gap", "label", "link", "image", "textInput", "checkboxInput", "textareaInput", "numberInput", "selectInput", "function", "state"];

// Step types whose inspector gets extra room — a page built visually
// (View), a form's field list (Input Form), and a full HTML page
// (Static Page) all need more space than a couple of text fields do.
const WIDE_INSPECTOR_TYPES: WorkflowNodeType[] = ["view", "inputForm", "staticPage"];

// Pixel height of one "row" slot in the View layout designer. Row is only
// a stacking/ordering key (see ViewLayoutEntry) — this is just how tall a
// row reads on screen while arranging blocks, not a real CSS height.
const DESIGNER_ROW_HEIGHT = 64;
const DESIGNER_MAX_ROW = 40;

interface ViewLayoutEntry {
    col?: number;
    span?: number;
    row?: number;
    height?: "auto" | "full";
}

function parseViewLayout(raw: string | undefined): Record<string, ViewLayoutEntry> {
    try {
        const parsed = JSON.parse(raw ?? "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

interface WorkflowEditorProps {
    workflow: {
        _id: string;
        name: string;
        active: boolean;
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
    };
}

function newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function outputHandlePosition(node: WorkflowNode, handle: string | null) {
    const def = NODE_DEFS[node.type];
    if (def.kind === "branch") {
        const y = handle === "false" ? node.y + NODE_HEIGHT * 0.75 : node.y + NODE_HEIGHT * 0.28;
        return { x: node.x + NODE_WIDTH, y };
    }
    return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
}

function inputHandlePosition(node: WorkflowNode) {
    return { x: node.x, y: node.y + NODE_HEIGHT / 2 };
}

function edgePathD(x1: number, y1: number, x2: number, y2: number) {
    const dx = Math.max(40, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function WorkflowEditor({ workflow }: WorkflowEditorProps) {
    const router = useRouter();
    const canvasRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<WorkflowNode[]>(workflow.nodes);
    const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const connectRef = useRef<{ fromId: string; handle: string | null } | null>(null);
    const designerRef = useRef<HTMLDivElement>(null);
    const layoutDragRef = useRef<{
        viewId: string;
        childId: string;
        mode: "move" | "resize";
        startClientX: number;
        startClientY: number;
        startCol: number;
        startSpan: number;
        startRow: number;
        colWidthPx: number;
    } | null>(null);

    const [name, setName] = useState(workflow.name);
    const [active, setActive] = useState(workflow.active);
    const [nodes, setNodes] = useState<WorkflowNode[]>(workflow.nodes);
    const [edges, setEdges] = useState<WorkflowEdge[]>(workflow.edges);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [connectingLine, setConnectingLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [origin, setOrigin] = useState("");
    const [lists, setLists] = useState<{ _id: string; name: string; fields?: { key: string; label: string; type: string }[] }[] | null>(null);
    const [callableWorkflows, setCallableWorkflows] = useState<{ _id: string; name: string; functions: { id: string; name: string }[] }[] | null>(
        null,
    );
    const [webhookTargets, setWebhookTargets] = useState<
        { workflowId: string; workflowName: string; nodeId: string; path: string; method: string }[] | null
    >(null);
    const [stepQuery, setStepQuery] = useState("");
    const [openCategories, setOpenCategories] = useState<Set<WorkflowStepCategory>>(() => new Set([CATEGORY_ORDER[0]]));

    nodesRef.current = nodes;

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    // Backs any field with `dynamicOptions: "lists"` (currently just Save
    // to List's "List" picker). Fetched once up front rather than lazily
    // per-node so switching between nodes doesn't re-fetch or flash empty.
    useEffect(() => {
        (async () => {
            try {
                const data = await withAuthRetry(() => orpc.list.list());
                setLists((data as any[]).map((l) => ({ _id: l._id, name: l.name, fields: l.fields ?? [] })));
            } catch {
                setLists([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Backs the Call step's "another workflow" picker — only workflows
    // with a public Function step and no Webhook step come back (see
    // `listCallable` in app/router/workflows.ts). Fetched once up front,
    // same as Lists above, so switching between nodes doesn't re-fetch.
    useEffect(() => {
        (async () => {
            try {
                const data = await withAuthRetry(() => orpc.workflow.listCallable());
                setCallableWorkflows(data as any[]);
            } catch {
                setCallableWorkflows([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Backs the Route and Forward steps' "webhook to target" picker — a
    // flat list of every Webhook step across the person's own workflows
    // (see `listWebhooks` in app/router/workflows.ts).
    useEffect(() => {
        (async () => {
            try {
                const data = await withAuthRetry(() => orpc.workflow.listWebhooks());
                setWebhookTargets(data as any[]);
            } catch {
                setWebhookTargets([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Drag-to-move and drag-to-connect both live on window-level listeners
    // so the interaction keeps working even if the cursor leaves the node
    // or the canvas mid-drag. Attached once — everything they touch is
    // either a ref or a functional setState update, so there's no stale
    // closure to worry about.
    useEffect(() => {
        function canvasPoint(e: MouseEvent) {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left + canvas.scrollLeft,
                y: e.clientY - rect.top + canvas.scrollTop,
            };
        }

        function onMove(e: MouseEvent) {
            if (dragRef.current) {
                const { x, y } = canvasPoint(e);
                const { id, offsetX, offsetY } = dragRef.current;
                setNodes((prev) =>
                    prev.map((n) =>
                        n.id === id
                            ? { ...n, x: Math.max(0, Math.min(CANVAS_WIDTH - NODE_WIDTH, x - offsetX)), y: Math.max(0, Math.min(CANVAS_HEIGHT - NODE_HEIGHT, y - offsetY)) }
                            : n,
                    ),
                );
                setDirty(true);
                return;
            }

            if (connectRef.current) {
                const fromNode = nodesRef.current.find((n) => n.id === connectRef.current!.fromId);
                if (!fromNode) return;
                const from = outputHandlePosition(fromNode, connectRef.current!.handle);
                const { x, y } = canvasPoint(e);
                setConnectingLine({ x1: from.x, y1: from.y, x2: x, y2: y });
            }
        }

        function onUp(e: MouseEvent) {
            if (dragRef.current) {
                dragRef.current = null;
            }

            if (connectRef.current) {
                const { fromId, handle } = connectRef.current;
                const { x, y } = canvasPoint(e);
                const target = nodesRef.current.find((n) => {
                    if (n.id === fromId) return false;
                    if (NODE_DEFS[n.type].kind === "trigger") return false;
                    return x >= n.x - 14 && x <= n.x + NODE_WIDTH + 14 && y >= n.y - 14 && y <= n.y + NODE_HEIGHT + 14;
                });
                if (target) {
                    // A handle can fan out to more than one target now (e.g.
                    // an Input Form step feeding both a "Save to Database"
                    // step and a "Static Page" step in parallel) — so this
                    // adds a new edge instead of replacing whatever the
                    // handle was already connected to. Re-dragging onto the
                    // same target is a no-op rather than a duplicate edge.
                    let isNewEdge = false;
                    setEdges((prev) => {
                        const alreadyConnected = prev.some((edge) => edge.source === fromId && edge.sourceHandle === handle && edge.target === target.id);
                        if (alreadyConnected) return prev;
                        isNewEdge = true;
                        return [...prev, { id: newId("e"), source: fromId, sourceHandle: handle, target: target.id }];
                    });
                    setDirty(true);

                    // Wiring a block into a View should show up somewhere
                    // the person can immediately see, not stacked
                    // invisibly on top of whatever's already at the
                    // default 0,0 spot — drop it into the next empty row
                    // instead. Only for a genuinely new connection: a
                    // re-drag over an already-connected block shouldn't
                    // reset a position the person may have since dragged
                    // elsewhere in the Layout designer.
                    if (isNewEdge && (target.type === "view" || target.type === "div")) {
                        setNodes((prev) =>
                            prev.map((n) => {
                                if (n.id !== target.id) return n;
                                const layout = parseViewLayout(n.data?.layout);
                                if (layout[fromId]) return n;
                                const maxRow = Object.values(layout).reduce((max, entry) => Math.max(max, entry.row ?? 0), -1);
                                const nextLayout = { ...layout, [fromId]: { col: 0, span: 12, row: maxRow + 1, height: "auto" as const } };
                                return { ...n, data: { ...n.data, layout: JSON.stringify(nextLayout) } };
                            }),
                        );
                    }
                }
                connectRef.current = null;
                setConnectingLine(null);
            }
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    // Delete/Backspace removes the selected step, as long as the person
    // isn't typing in a field — otherwise Backspace while editing a text
    // field would delete the node out from under them.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Delete" && e.key !== "Backspace") return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!target?.isContentEditable;
            if (isEditable || !selectedNodeId) return;
            e.preventDefault();
            deleteNode(selectedNodeId);
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedNodeId]);

    // Drag-to-move and drag-to-resize for blocks inside the View layout
    // designer (see the "Layout" section of a selected View's inspector).
    // Same window-level-listener approach as the main canvas drag above,
    // kept in its own effect since it targets a different ref and a
    // different piece of UI.
    useEffect(() => {
        function onMove(e: MouseEvent) {
            const drag = layoutDragRef.current;
            if (!drag) return;
            const deltaCols = Math.round((e.clientX - drag.startClientX) / drag.colWidthPx);
            const deltaRows = Math.round((e.clientY - drag.startClientY) / DESIGNER_ROW_HEIGHT);

            if (drag.mode === "move") {
                const span = drag.startSpan;
                const col = Math.max(0, Math.min(12 - span, drag.startCol + deltaCols));
                const row = Math.max(0, Math.min(DESIGNER_MAX_ROW, drag.startRow + deltaRows));
                updateViewLayout(drag.viewId, drag.childId, { col, row });
            } else {
                const span = Math.max(1, Math.min(12 - drag.startCol, drag.startSpan + deltaCols));
                updateViewLayout(drag.viewId, drag.childId, { span });
            }
        }

        function onUp() {
            layoutDragRef.current = null;
        }

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function startLayoutDrag(e: React.MouseEvent, viewId: string, childId: string, pos: Required<ViewLayoutEntry>, mode: "move" | "resize") {
        e.preventDefault();
        e.stopPropagation();
        const rect = designerRef.current?.getBoundingClientRect();
        if (!rect) return;
        layoutDragRef.current = {
            viewId,
            childId,
            mode,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startCol: pos.col,
            startSpan: pos.span,
            startRow: pos.row,
            colWidthPx: rect.width / 12,
        };
    }

    function handleNodeMouseDown(e: React.MouseEvent, node: WorkflowNode) {
        e.stopPropagation();
        setSelectedNodeId(node.id);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + canvas.scrollLeft;
        const y = e.clientY - rect.top + canvas.scrollTop;
        dragRef.current = { id: node.id, offsetX: x - node.x, offsetY: y - node.y };
    }

    function handleOutputMouseDown(e: React.MouseEvent, node: WorkflowNode, handle: string | null) {
        e.stopPropagation();
        e.preventDefault();
        connectRef.current = { fromId: node.id, handle };
        const from = outputHandlePosition(node, handle);
        setConnectingLine({ x1: from.x, y1: from.y, x2: from.x, y2: from.y });
    }

    function addNode(type: WorkflowNodeType) {
        const def = NODE_DEFS[type];
        const index = nodes.length;
        const node: WorkflowNode = {
            id: newId("n"),
            type,
            x: 60 + (index % 3) * 260,
            y: 60 + Math.floor(index / 3) * 180,
            data: def.defaultData(),
        };
        setNodes((prev) => [...prev, node]);
        setSelectedNodeId(node.id);
        setDirty(true);
    }

    function deleteNode(nodeId: string) {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
        setDirty(true);
    }

    function updateNodeData(nodeId: string, key: string, value: string | boolean) {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n)));
        setDirty(true);
    }

    // Same as updateNodeData, but for pickers that need to set several
    // keys together as one change — e.g. picking a Call step's function
    // sets both `functionId` and a denormalized `functionName` in one go,
    // so the node card never shows one without the other mid-update.
    function updateNodeDataMulti(nodeId: string, patch: Record<string, string>) {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
        setDirty(true);
    }

    // Merges a single child's position into a View node's data.layout —
    // keyed by the child step's id, so it survives independently of the
    // order blocks were connected in. See the "Layout" section of the
    // inspector below and lib/steps/view.ts (the server-side reader).
    function updateViewLayout(viewNodeId: string, childId: string, patch: ViewLayoutEntry) {
        setNodes((prev) =>
            prev.map((n) => {
                if (n.id !== viewNodeId) return n;
                const layout = parseViewLayout(n.data?.layout);
                const next = { ...layout, [childId]: { ...layout[childId], ...patch } };
                return { ...n, data: { ...n.data, layout: JSON.stringify(next) } };
            }),
        );
        setDirty(true);
    }

    function deleteEdge(edgeId: string) {
        setEdges((prev) => prev.filter((e) => e.id !== edgeId));
        setDirty(true);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            await withAuthRetry(() => orpc.workflow.update({ id: workflow._id, name: name.trim() || "Untitled workflow", active, nodes, edges }));
            setDirty(false);
            setSaved(true);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't save the workflow.");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Delete this workflow? This can't be undone.")) return;
        setDeleting(true);
        try {
            await withAuthRetry(() => orpc.workflow.remove({ id: workflow._id }));
            router.push("/d/workflows");
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : "Couldn't delete the workflow.");
            setDeleting(false);
        }
    }

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

    const q = stepQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;

    // Every step grouped under its category, in palette order. While
    // searching, a category's list is narrowed to its matches — the
    // category itself stays visible only if it has at least one.
    const categorizedSteps = CATEGORY_ORDER.map((category) => {
        const types = NODE_ORDER.filter((type) => STEP_CATEGORIES[type] === category);
        const visible = hasQuery
            ? types.filter((type) => {
                  const def = NODE_DEFS[type];
                  return def.label.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
              })
            : types;
        return { category, types: visible };
    });
    const totalMatches = categorizedSteps.reduce((sum, c) => sum + c.types.length, 0);

    // A category is open if the person opened it manually, OR — while
    // searching — if it has a match. That second half is what makes a
    // match "jump out" of a folded section without the person having to
    // find and open it themselves.
    function isCategoryOpen(category: WorkflowStepCategory) {
        if (hasQuery) return categorizedSteps.find((c) => c.category === category)!.types.length > 0;
        return openCategories.has(category);
    }

    function toggleCategory(category: WorkflowStepCategory) {
        setOpenCategories((prev) => {
            const next = new Set(prev);
            if (next.has(category)) next.delete(category);
            else next.add(category);
            return next;
        });
    }

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-200 px-6 py-3">
                <Link href="/d/workflows" className="text-sm text-neutral-500 hover:text-neutral-900">
                    ← Workflows
                </Link>
                <Input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                    }}
                    className="h-8 max-w-xs font-medium"
                />
                <button
                    type="button"
                    onClick={() => {
                        setActive((a) => !a);
                        setDirty(true);
                    }}
                    className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
                        active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-neutral-200 bg-neutral-50 text-neutral-500"
                    }`}
                >
                    <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-neutral-400"}`} />
                    {active ? "Active" : "Inactive"}
                </button>

                <div className="ml-auto flex items-center gap-3">
                    {error && <span className="text-sm text-destructive">{error}</span>}
                    {!error && saved && !dirty && <span className="text-sm text-neutral-400">Saved</span>}
                    {dirty && !saving && <span className="text-sm text-neutral-400">Unsaved changes</span>}
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
                        {deleting ? "Deleting…" : "Delete"}
                    </Button>
                    <Button type="button" size="sm" onClick={handleSave} disabled={saving || !dirty}>
                        {saving ? "Saving…" : "Save"}
                    </Button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1">
                {/* Palette */}
                <div className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-neutral-200">
                    {/* This header (title + search) has no scroll behavior
                        of its own, so it stays put while the category
                        list below it scrolls — "on top, not moving". */}
                    <div className="shrink-0 border-b border-neutral-200 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Add step</p>
                        <Input type="text" value={stepQuery} onChange={(e) => setStepQuery(e.target.value)} placeholder="Search steps…" />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {categorizedSteps.map(({ category, types }) => {
                            if (hasQuery && types.length === 0) return null;
                            const meta = CATEGORY_META[category];
                            const open = isCategoryOpen(category);
                            return (
                                <div key={category} className="mb-1">
                                    <button
                                        type="button"
                                        onClick={() => toggleCategory(category)}
                                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-50"
                                    >
                                        <span className="flex flex-col">
                                            <span className="text-sm font-semibold text-neutral-900">{meta.label}</span>
                                            <span className="text-xs text-neutral-400">{meta.blurb}</span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                            <span className="text-xs text-neutral-400">{types.length}</span>
                                            <svg
                                                className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform", open && "rotate-90")}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </span>
                                    </button>
                                    {open && (
                                        <div className="flex flex-col gap-2 px-1 pb-2 pt-1">
                                            {types.map((type) => {
                                                const def = NODE_DEFS[type];
                                                return (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => addNode(type)}
                                                        className="rounded-md border border-neutral-200 px-3 py-2 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                                                    >
                                                        <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                                                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: def.color }} />
                                                            {def.label}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-neutral-500">{def.description}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {hasQuery && totalMatches === 0 && <p className="px-2 py-4 text-xs text-neutral-400">No steps match "{stepQuery}".</p>}
                    </div>
                </div>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    onMouseDown={() => setSelectedNodeId(null)}
                    className="relative flex-1 overflow-auto bg-neutral-50"
                    style={{
                        backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                    }}
                >
                    <div style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, position: "relative" }}>
                        <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="pointer-events-none absolute left-0 top-0">
                            {edges.map((edge) => {
                                const source = nodes.find((n) => n.id === edge.source);
                                const target = nodes.find((n) => n.id === edge.target);
                                if (!source || !target) return null;
                                const from = outputHandlePosition(source, edge.sourceHandle);
                                const to = inputHandlePosition(target);
                                const color = edge.sourceHandle === "true" ? "#059669" : edge.sourceHandle === "false" ? "#dc2626" : "#a1a1aa";
                                return (
                                    <path
                                        key={edge.id}
                                        d={edgePathD(from.x, from.y, to.x, to.y)}
                                        stroke={color}
                                        strokeWidth={2}
                                        fill="none"
                                        className="pointer-events-auto cursor-pointer"
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            deleteEdge(edge.id);
                                        }}
                                    >
                                        <title>Click to remove this connection</title>
                                    </path>
                                );
                            })}
                            {connectingLine && (
                                <path
                                    d={edgePathD(connectingLine.x1, connectingLine.y1, connectingLine.x2, connectingLine.y2)}
                                    stroke="#a1a1aa"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fill="none"
                                />
                            )}
                        </svg>

                        {nodes.map((node) => {
                            const def = NODE_DEFS[node.type];
                            const isSelected = node.id === selectedNodeId;
                            return (
                                <div
                                    key={node.id}
                                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                    className={`absolute cursor-grab select-none rounded-lg border bg-white shadow-sm active:cursor-grabbing ${
                                        isSelected ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                                    }`}
                                    style={{ left: node.x, top: node.y, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
                                >
                                    <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
                                        <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-900">
                                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: def.color }} />
                                            <span className="truncate">{def.label}</span>
                                        </span>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={() => deleteNode(node.id)}
                                            className="shrink-0 text-neutral-300 hover:text-destructive"
                                            aria-label="Delete step"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="truncate px-3 py-2 text-xs text-neutral-500">{def.summarize(node.data ?? {})}</div>

                                    {def.kind !== "trigger" && (
                                        <div
                                            data-handle
                                            className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-400"
                                        />
                                    )}

                                    {def.kind === "branch" ? (
                                        <>
                                            <div
                                                data-handle
                                                onMouseDown={(e) => handleOutputMouseDown(e, node, "true")}
                                                className="absolute -right-1.5 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-emerald-500"
                                                style={{ top: NODE_HEIGHT * 0.28 }}
                                                title="True"
                                            />
                                            <div
                                                data-handle
                                                onMouseDown={(e) => handleOutputMouseDown(e, node, "false")}
                                                className="absolute -right-1.5 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-red-500"
                                                style={{ top: NODE_HEIGHT * 0.75 }}
                                                title="False"
                                            />
                                        </>
                                    ) : def.kind !== "terminal" ? (
                                        <div
                                            data-handle
                                            onMouseDown={(e) => handleOutputMouseDown(e, node, null)}
                                            className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-neutral-400"
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Inspector */}
                <div
                    className={cn(
                        "shrink-0 overflow-y-auto border-l border-neutral-200 p-4",
                        selectedNode && WIDE_INSPECTOR_TYPES.includes(selectedNode.type) ? "w-[32rem]" : "w-72",
                    )}
                >
                    {!selectedNode ? (
                        <p className="text-sm text-neutral-400">
                            Select a step to edit it, or drag from the dot on its right edge to connect it to another step. Drag from the same dot again to
                            fan out to a second step — both run in parallel.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">{NODE_DEFS[selectedNode.type].label}</p>
                                <p className="text-xs text-neutral-500">{NODE_DEFS[selectedNode.type].description}</p>
                            </div>

                            {NODE_DEFS[selectedNode.type].fields.map((field) => {
                                // Special handling for Project step with findFields
                                if (field.kind === "select" && field.dynamicOptions === "findFields" && selectedNode.type === "project") {
                                    const findEdge = edges.find((e) => e.target === selectedNode.id && nodes.find((n) => n.id === e.source)?.type === "find");
                                    const findNode = findEdge ? nodes.find((n) => n.id === findEdge.source) : null;
                                    const findListId = findNode?.data?.list;
                                    const findList = lists?.find((l) => l._id === findListId);
                                    const selectedFields = (() => {
                                        try {
                                            return JSON.parse(selectedNode.data?.[field.key] ?? "[]");
                                        } catch {
                                            return [];
                                        }
                                    })();

                                    return (
                                        <div key={field.key} className="flex flex-col gap-3">
                                            <Label>{field.label}</Label>
                                            {!findNode ? (
                                                <p className="text-sm text-neutral-500">Chain from a Find step to see fields</p>
                                            ) : !findList ? (
                                                <p className="text-sm text-neutral-500">No list selected in Find step</p>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    {/* Always include _id */}
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.includes("_id")}
                                                            onChange={(e) => {
                                                                const updated = e.target.checked
                                                                    ? [...selectedFields, "_id"]
                                                                    : selectedFields.filter((f) => f !== "_id");
                                                                updateNodeData(selectedNode.id, field.key, JSON.stringify(updated));
                                                            }}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-neutral-700">_id</span>
                                                    </label>
                                                    {/* System fields */}
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.includes("createdAt")}
                                                            onChange={(e) => {
                                                                const updated = e.target.checked
                                                                    ? [...selectedFields, "createdAt"]
                                                                    : selectedFields.filter((f) => f !== "createdAt");
                                                                updateNodeData(selectedNode.id, field.key, JSON.stringify(updated));
                                                            }}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-neutral-700">createdAt</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFields.includes("updatedAt")}
                                                            onChange={(e) => {
                                                                const updated = e.target.checked
                                                                    ? [...selectedFields, "updatedAt"]
                                                                    : selectedFields.filter((f) => f !== "updatedAt");
                                                                updateNodeData(selectedNode.id, field.key, JSON.stringify(updated));
                                                            }}
                                                            className="h-4 w-4"
                                                        />
                                                        <span className="text-neutral-700">updatedAt</span>
                                                    </label>
                                                    {/* List-specific fields from schema */}
                                                    {findList.fields?.map((listField) => (
                                                        <label key={listField.key} className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFields.includes(listField.key)}
                                                                onChange={(e) => {
                                                                    const updated = e.target.checked
                                                                        ? [...selectedFields, listField.key]
                                                                        : selectedFields.filter((f) => f !== listField.key);
                                                                    updateNodeData(selectedNode.id, field.key, JSON.stringify(updated));
                                                                }}
                                                                className="h-4 w-4"
                                                            />
                                                            <span className="text-neutral-700">{listField.label}</span>
                                                            <span className="text-xs text-neutral-400">({listField.type})</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                // State's Mapping field only makes sense once something is
                                // actually feeding this step data to map — with no incoming
                                // edge there's nothing to pull {{field}} values from, so hide
                                // it rather than show a mapping box that can't do anything.
                                if (selectedNode.type === "state" && field.key === "mapping") {
                                    const hasInput = edges.some((e) => e.target === selectedNode.id);
                                    if (!hasInput) {
                                        return (
                                            <div key={field.key} className="flex flex-col gap-1.5">
                                                <Label>{field.label}</Label>
                                                <p className="text-sm text-neutral-500">Chain a step into this State step to map its data.</p>
                                            </div>
                                        );
                                    }
                                }

                                return (
                                    <div key={field.key} className="flex flex-col gap-1.5">
                                        <Label htmlFor={field.key}>{field.label}</Label>
                                        {field.kind === "select" && field.dynamicOptions === "lists" ? (
                                            <select
                                                id={field.key}
                                                value={selectedNode.data?.[field.key] ?? ""}
                                                onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                disabled={lists === null}
                                            >
                                                <option value="">{lists === null ? "Loading lists…" : lists.length === 0 ? "No lists yet" : "Select a list…"}</option>
                                                {lists?.map((l) => (
                                                    <option key={l._id} value={l._id}>
                                                        {l.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.kind === "select" ? (
                                        <select
                                            id={field.key}
                                            value={selectedNode.data?.[field.key] ?? ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                        >
                                            {field.options?.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : field.kind === "html" ? (
                                        <HtmlEditor
                                            id={field.key}
                                            value={selectedNode.data?.[field.key] ?? ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                        />
                                    ) : field.kind === "textarea" ? (
                                        <Textarea
                                            id={field.key}
                                            value={selectedNode.data?.[field.key] ?? ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={4}
                                        />
                                    ) : (
                                        <Input
                                            id={field.key}
                                            value={selectedNode.data?.[field.key] ?? ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                        />
                                        )}
                                    </div>
                                );
                            })}

                            {selectedNode.type === "class" &&
                                (() => {
                                    // A Class step's own inspector is entirely dynamic: which
                                    // fields make sense depends on whatever this step's output
                                    // is wired into (drag from its dot onto a Label or a Div) —
                                    // see app/lib/step-defs/class.ts for why this isn't just a
                                    // normal `fields` list, and app/lib-server/steps/class.ts +
                                    // view.ts for how the classes actually reach the page.
                                    const targetEdge = edges.find((e) => e.source === selectedNode.id);
                                    const targetNode = targetEdge ? nodes.find((n) => n.id === targetEdge.target) : null;
                                    const data = selectedNode.data ?? {};
                                    const preview = buildClassName(data);

                                    const select = (key: string, label: string, options: ClassOption[]) => (
                                        <div key={key} className="flex flex-col gap-1.5">
                                            <Label htmlFor={key}>{label}</Label>
                                            <select
                                                id={key}
                                                value={data?.[key] ?? ""}
                                                onChange={(e) => updateNodeData(selectedNode.id, key, e.target.value)}
                                                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                            >
                                                {options.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );

                                    const toggle = (key: string, label: string) => (
                                        <label key={key} className="flex items-center gap-2 text-sm text-neutral-700">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(data?.[key])}
                                                onChange={(e) => updateNodeData(selectedNode.id, key, e.target.checked)}
                                                className="h-4 w-4 rounded border-neutral-300"
                                            />
                                            {label}
                                        </label>
                                    );

                                    return (
                                        <div className="flex flex-col gap-4">
                                            {!targetNode ? (
                                                <p className="text-sm text-neutral-500">
                                                    Not connected yet. Drag from this step's output dot onto a Label or a Div to see styling options for
                                                    it — the options shown here change depending which one it's wired into.
                                                </p>
                                            ) : targetNode.type === "label" ? (
                                                <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3">
                                                    <p className="text-xs font-medium text-neutral-500">Chained into a Label — text styles</p>
                                                    {select("size", "Size", TEXT_SIZE_OPTIONS)}
                                                    {select("weight", "Weight", FONT_WEIGHT_OPTIONS)}
                                                    {select("textAlign", "Align", TEXT_ALIGN_OPTIONS)}
                                                    {select("textColor", "Text color", TEXT_COLOR_OPTIONS)}
                                                    {select("bgColor", "Background color", BG_COLOR_OPTIONS)}
                                                    {toggle("bgSoft", "Soft background (lighter shade)")}
                                                </div>
                                            ) : targetNode.type === "div" ? (
                                                <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3">
                                                    <p className="text-xs font-medium text-neutral-500">Chained into a Div — layout & spacing</p>
                                                    {select("direction", "Direction", DIRECTION_OPTIONS)}
                                                    {select("itemsAlign", "Align items", ITEMS_ALIGN_OPTIONS)}
                                                    {select("justify", "Justify content", JUSTIFY_OPTIONS)}
                                                    {select("gap", "Gap", GAP_OPTIONS)}
                                                    {select("padding", "Padding", PADDING_OPTIONS)}
                                                    {select("margin", "Margin", MARGIN_OPTIONS)}
                                                    {select("rounded", "Rounded corners", ROUNDED_OPTIONS)}
                                                    {select("shadow", "Shadow", SHADOW_OPTIONS)}
                                                    {select("width", "Width", WIDTH_OPTIONS)}
                                                    {select("textColor", "Text color", TEXT_COLOR_OPTIONS)}
                                                    {select("bgColor", "Background color", BG_COLOR_OPTIONS)}
                                                    {toggle("bgSoft", "Soft background (lighter shade)")}
                                                    {toggle("border", "Border")}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-neutral-500">
                                                    Class steps currently style a Label or a Div — {NODE_DEFS[targetNode.type].label} isn't one of those,
                                                    so nothing here will apply to it.
                                                </p>
                                            )}

                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="custom">Custom classes (advanced)</Label>
                                                <Input
                                                    id="custom"
                                                    value={data?.custom ?? ""}
                                                    onChange={(e) => updateNodeData(selectedNode.id, "custom", e.target.value)}
                                                    placeholder="e.g. tracking-wide uppercase"
                                                />
                                                <p className="text-xs text-neutral-400">
                                                    Best effort only — Tailwind only generates CSS for class names it can find in the app's source at
                                                    build time, so a class typed here works reliably only if it also appears somewhere else in the
                                                    codebase already. The pickers above are backed by a table of pre-built classes for exactly this
                                                    reason.
                                                </p>
                                            </div>

                                            <div className="rounded-md bg-neutral-50 p-2">
                                                <p className="text-xs text-neutral-500">Resulting class attribute</p>
                                                <p className="break-all font-mono text-xs text-neutral-700">{preview || "(none)"}</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                            {selectedNode.type === "call" &&
                                (() => {
                                    const scope = selectedNode.data?.scope === "external" ? "external" : "internal";
                                    const internalFunctions = nodes
                                        .filter((n) => n.type === "function" && n.id !== selectedNode.id)
                                        .map((n) => ({ id: n.id, name: n.data?.name ? String(n.data.name) : "Untitled function" }));
                                    const externalWorkflow = callableWorkflows?.find((w) => w._id === selectedNode.data?.workflowId);
                                    const functionOptions = scope === "internal" ? internalFunctions : externalWorkflow?.functions ?? [];

                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="call-scope">Call</Label>
                                                <select
                                                    id="call-scope"
                                                    value={scope}
                                                    onChange={(e) =>
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            scope: e.target.value,
                                                            workflowId: "",
                                                            workflowName: "",
                                                            functionId: "",
                                                            functionName: "",
                                                        })
                                                    }
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                >
                                                    <option value="internal">A function in this workflow</option>
                                                    <option value="external">A function in another workflow</option>
                                                </select>
                                            </div>

                                            {scope === "external" && (
                                                <div className="flex flex-col gap-1.5">
                                                    <Label htmlFor="call-workflow">Workflow</Label>
                                                    <select
                                                        id="call-workflow"
                                                        value={selectedNode.data?.workflowId ?? ""}
                                                        onChange={(e) => {
                                                            const wf = callableWorkflows?.find((w) => w._id === e.target.value);
                                                            updateNodeDataMulti(selectedNode.id, {
                                                                workflowId: e.target.value,
                                                                workflowName: wf?.name ?? "",
                                                                functionId: "",
                                                                functionName: "",
                                                            });
                                                        }}
                                                        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                        disabled={callableWorkflows === null}
                                                    >
                                                        <option value="">
                                                            {callableWorkflows === null
                                                                ? "Loading workflows…"
                                                                : callableWorkflows.length === 0
                                                                  ? "No workflows with a public function yet"
                                                                  : "Select a workflow…"}
                                                        </option>
                                                        {callableWorkflows?.map((w) => (
                                                            <option key={w._id} value={w._id}>
                                                                {w.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="call-function">Function</Label>
                                                <select
                                                    id="call-function"
                                                    value={selectedNode.data?.functionId ?? ""}
                                                    onChange={(e) => {
                                                        const fn = functionOptions.find((f) => f.id === e.target.value);
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            functionId: e.target.value,
                                                            functionName: fn?.name ?? "",
                                                        });
                                                    }}
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    disabled={scope === "external" && !selectedNode.data?.workflowId}
                                                >
                                                    <option value="">
                                                        {scope === "internal"
                                                            ? internalFunctions.length === 0
                                                                ? "No Function steps in this workflow"
                                                                : "Select a function…"
                                                            : !selectedNode.data?.workflowId
                                                              ? "Select a workflow first"
                                                              : functionOptions.length === 0
                                                                ? "No public functions"
                                                                : "Select a function…"}
                                                    </option>
                                                    {functionOptions.map((f) => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })()}

                            {(selectedNode.type === "route" || selectedNode.type === "forward") &&
                                (() => {
                                    const workflowOptions = Array.from(new Map((webhookTargets ?? []).map((t) => [t.workflowId, t.workflowName])).entries()).map(
                                        ([id, name]) => ({ id, name }),
                                    );
                                    const hooksForWorkflow = (webhookTargets ?? []).filter((t) => t.workflowId === selectedNode.data?.workflowId);

                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="target-workflow">Workflow</Label>
                                                <select
                                                    id="target-workflow"
                                                    value={selectedNode.data?.workflowId ?? ""}
                                                    onChange={(e) => {
                                                        const opt = workflowOptions.find((w) => w.id === e.target.value);
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            workflowId: e.target.value,
                                                            workflowName: opt?.name ?? "",
                                                            webhookNodeId: "",
                                                            webhookPath: "",
                                                        });
                                                    }}
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    disabled={webhookTargets === null}
                                                >
                                                    <option value="">
                                                        {webhookTargets === null
                                                            ? "Loading workflows…"
                                                            : workflowOptions.length === 0
                                                              ? "No workflows with a webhook yet"
                                                              : "Select a workflow…"}
                                                    </option>
                                                    {workflowOptions.map((w) => (
                                                        <option key={w.id} value={w.id}>
                                                            {w.id === workflow._id ? `${w.name} (this workflow)` : w.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="target-webhook">Webhook step</Label>
                                                <select
                                                    id="target-webhook"
                                                    value={selectedNode.data?.webhookNodeId ?? ""}
                                                    onChange={(e) => {
                                                        const hook = hooksForWorkflow.find((h) => h.nodeId === e.target.value);
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            webhookNodeId: e.target.value,
                                                            webhookPath: hook?.path ?? "",
                                                        });
                                                    }}
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    disabled={!selectedNode.data?.workflowId}
                                                >
                                                    <option value="">
                                                        {!selectedNode.data?.workflowId ? "Select a workflow first" : "Select a webhook step…"}
                                                    </option>
                                                    {hooksForWorkflow.map((h) => (
                                                        <option key={h.nodeId} value={h.nodeId}>
                                                            {h.method} /{h.path}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })()}

                            {(selectedNode.type === "view" || selectedNode.type === "div") &&
                                (() => {
                                    const layout = parseViewLayout(selectedNode.data?.layout);
                                    const children = edges
                                        .filter((e) => e.target === selectedNode.id)
                                        .map((e) => nodes.find((n) => n.id === e.source))
                                        .filter((n): n is WorkflowNode => !!n && VIEW_BLOCK_TYPES.includes(n.type));
                                    const positions = new Map(children.map((child) => [child.id, { col: 0, span: 12, row: 0, height: "auto" as const, ...layout[child.id] }]));
                                    const maxRow = children.reduce((max, child) => Math.max(max, positions.get(child.id)!.row), 0);

                                    return (
                                        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-900">Layout</p>
                                                <p className="text-xs text-neutral-500">
                                                    Connect a Menu, Tabs, Navbar, Footer, Table, Input Form, Page, Gap, Function, a Div, or another View
                                                    into this step, then drag it below to place it on {selectedNode.type === "div" ? "the container" : "the page"}
                                                    {" "}— a 12-column grid. Drag a block's right edge to resize it. A connected Function starts out as an
                                                    empty slot and fills in with whatever it produced once something calls it.{" "}
                                                    <span className="font-medium text-neutral-600">Scrolls</span> is a normal page that scrolls with its
                                                    content; <span className="font-medium text-neutral-600">Full screen</span> fills the browser window,
                                                    like an app screen.
                                                </p>
                                            </div>

                                            {children.length === 0 ? (
                                                <p className="text-xs text-neutral-400">
                                                    Nothing connected yet. Drag from a block step's output dot onto this step to add it here.
                                                </p>
                                            ) : (
                                                <div
                                                    ref={designerRef}
                                                    className="relative overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
                                                    style={{ height: (maxRow + 3) * DESIGNER_ROW_HEIGHT }}
                                                >
                                                    <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
                                                        {Array.from({ length: 12 }).map((_, i) => (
                                                            <div key={i} className="border-r border-dashed border-neutral-200 last:border-r-0" />
                                                        ))}
                                                    </div>

                                                    {children.map((child) => {
                                                        const pos = positions.get(child.id)!;
                                                        return (
                                                            <div
                                                                key={child.id}
                                                                onMouseDown={(e) => startLayoutDrag(e, selectedNode.id, child.id, pos, "move")}
                                                                className="absolute flex cursor-move select-none flex-col justify-between overflow-hidden rounded-md border border-neutral-300 bg-white p-2 shadow-sm"
                                                                style={{
                                                                    left: `${(pos.col / 12) * 100}%`,
                                                                    width: `${(pos.span / 12) * 100}%`,
                                                                    top: pos.row * DESIGNER_ROW_HEIGHT + 4,
                                                                    height: DESIGNER_ROW_HEIGHT - 8,
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                                        <span
                                                                            className="h-2 w-2 shrink-0 rounded-full"
                                                                            style={{ backgroundColor: NODE_DEFS[child.type].color }}
                                                                        />
                                                                        <span className="truncate text-xs font-medium text-neutral-800">{NODE_DEFS[child.type].label}</span>
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={(e) => e.stopPropagation()}
                                                                        onClick={() =>
                                                                            updateViewLayout(selectedNode.id, child.id, { height: pos.height === "full" ? "auto" : "full" })
                                                                        }
                                                                        className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-200"
                                                                        title={
                                                                            pos.height === "full"
                                                                                ? "Fills the screen — click for a normal scrolling page"
                                                                                : "Normal scrolling page — click to fill the screen"
                                                                        }
                                                                    >
                                                                        {pos.height === "full" ? "Full screen" : "Scrolls"}
                                                                    </button>
                                                                </div>
                                                                <p className="truncate text-[10px] text-neutral-400">{NODE_DEFS[child.type].summarize(child.data ?? {})}</p>
                                                                <div
                                                                    onMouseDown={(e) => startLayoutDrag(e, selectedNode.id, child.id, pos, "resize")}
                                                                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                            {(() => {
                                const note = NODE_DEFS[selectedNode.type].inspectorNote?.(selectedNode.data ?? {}, { origin, active });
                                if (!note) return null;
                                return (
                                    <div className="rounded-md bg-neutral-50 p-2">
                                        <p className="text-xs text-neutral-500">{note.label}</p>
                                        <p className="break-all font-mono text-xs text-neutral-700">{note.value}</p>
                                        {note.warning && <p className="mt-1 text-xs text-amber-600">{note.warning}</p>}
                                    </div>
                                );
                            })()}

                            <Button type="button" variant="outline" size="sm" onClick={() => deleteNode(selectedNode.id)}>
                                Delete step
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}