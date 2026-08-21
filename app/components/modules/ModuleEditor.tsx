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
import { Switch } from "@/app/components/ui/switch";
import { NODE_DEFS, NODE_ORDER, CATEGORY_ORDER, CATEGORY_META, NODE_CATEGORIES, type ModuleNode, type ModuleEdge, type ModuleNodeType, type ModuleNodeCategory } from "@/app/lib/moduleTypes";
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
    IMAGE_WIDTH_OPTIONS,
    IMAGE_HEIGHT_OPTIONS,
    OBJECT_FIT_OPTIONS,
    type ClassOption,
} from "@/app/lib/tailwindClasses";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 78;
// Fallback footprint for a Comment sticky note when its width/height
// fields are empty or unparsable.
const COMMENT_DEFAULT_WIDTH = 220;
const COMMENT_DEFAULT_HEIGHT = 140;
// Fallback footprint for a Group Box when its width/height fields are
// empty or unparsable.
const BOX_DEFAULT_WIDTH = 360;
const BOX_DEFAULT_HEIGHT = 240;
// Floor for dragging either annotation node's resize handle — keeps a
// title/text and the resize grip from ever overlapping themselves.
const ANNOTATION_MIN_WIDTH = 160;
const ANNOTATION_MIN_HEIGHT = 90;

// Preset sticky-note palette for the Comment node's Color field. Keyed by
// the same values as COLOR_OPTIONS in node-defs/comment.ts.
const COMMENT_COLORS: Record<string, { bg: string; border: string; selectedBorder: string; label: string; text: string; placeholder: string }> = {
    yellow: { bg: "#fef9c3", border: "#fde68a", selectedBorder: "#eab308", label: "#a16207", text: "#78350f", placeholder: "#ca8a04" },
    pink: { bg: "#fce7f3", border: "#fbcfe8", selectedBorder: "#ec4899", label: "#be185d", text: "#831843", placeholder: "#db2777" },
    blue: { bg: "#dbeafe", border: "#bfdbfe", selectedBorder: "#3b82f6", label: "#1d4ed8", text: "#1e3a8a", placeholder: "#2563eb" },
    green: { bg: "#dcfce7", border: "#bbf7d0", selectedBorder: "#22c55e", label: "#15803d", text: "#14532d", placeholder: "#16a34a" },
    purple: { bg: "#ede9fe", border: "#ddd6fe", selectedBorder: "#8b5cf6", label: "#6d28d9", text: "#4c1d95", placeholder: "#7c3aed" },
    gray: { bg: "#f3f4f6", border: "#e5e7eb", selectedBorder: "#6b7280", label: "#374151", text: "#1f2937", placeholder: "#6b7280" },
};

function commentColors(data: Record<string, any> | undefined) {
    return COMMENT_COLORS[data?.color as string] ?? COMMENT_COLORS.yellow;
}

// Most nodes are a fixed NODE_WIDTH × NODE_HEIGHT card, but the two
// canvas-only "annotation" nodes (see node-defs/types.ts) are bigger and
// user-resizable — both Group Box and Comment persist their size in
// data.width/data.height (see the resize handle in the node card below
// and resizeRef in the drag effect). Used everywhere a node's actual
// on-screen footprint matters — drag clamping, marquee selection,
// connect-target hit testing, and the card's own rendered size.
function nodeSize(node: Pick<ModuleNode, "type" | "data">): { width: number; height: number } {
    if (node.type === "box") {
        const w = parseInt(node.data?.width, 10);
        const h = parseInt(node.data?.height, 10);
        return {
            width: Number.isFinite(w) && w > 0 ? w : BOX_DEFAULT_WIDTH,
            height: Number.isFinite(h) && h > 0 ? h : BOX_DEFAULT_HEIGHT,
        };
    }
    if (node.type === "comment") {
        const w = parseInt(node.data?.width, 10);
        const h = parseInt(node.data?.height, 10);
        return {
            width: Number.isFinite(w) && w > 0 ? w : COMMENT_DEFAULT_WIDTH,
            height: Number.isFinite(h) && h > 0 ? h : COMMENT_DEFAULT_HEIGHT,
        };
    }
    return { width: NODE_WIDTH, height: NODE_HEIGHT };
}
// Starting size of the canvas workspace — big enough that most modules
// never need to grow it, so there's only a little scroll to begin with.
const INITIAL_CANVAS_WIDTH = 2400;
const INITIAL_CANVAS_HEIGHT = 1400;
// Scrolling within this many px of the current right/bottom edge grows
// the workspace by CANVAS_GROW_STEP in that direction — this is what
// makes the canvas feel infinite instead of hard-capped at a fixed size.
const CANVAS_GROW_THRESHOLD = 400;
const CANVAS_GROW_STEP = 1200;
// Sane ceiling so the canvas can't be scrolled into unbounded, slow-to-
// render territory — effectively infinite for any real module.
const CANVAS_MAX_SIZE = 20000;

// Node types that can be dropped into a View's page — see the "Layout"
// section rendered below for a selected View node, and its server-side
// counterpart, EMBEDDABLE_TYPES in app/lib-server/nodes/view.ts.
const VIEW_BLOCK_TYPES: ModuleNodeType[] = ["menu", "tabs", "navbar", "footer", "view", "div", "table", "listView", "card", "inputForm", "staticPage", "gap", "label", "link", "image", "textInput", "checkboxInput", "textareaInput", "numberInput", "selectInput", "function", "state"];

// Node types whose inspector gets extra room — a page built visually
// (View), a form's field list (Input Form), and a full HTML page
// (Static Page) all need more space than a couple of text fields do.
const WIDE_INSPECTOR_TYPES: ModuleNodeType[] = ["view", "inputForm", "staticPage"];

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

interface ModuleEditorProps {
    module: {
        _id: string;
        name: string;
        active: boolean;
        nodes: ModuleNode[];
        edges: ModuleEdge[];
    };
    // "module" (default) is the DB-backed editor at /d/modules/[id]. "local"
    // is a file-backed module from app/local-modules (see
    // app/lib-server/localModules.ts) opened via /d/local-modules/[id] —
    // same canvas, same node palette, just a different save/delete target
    // (orpc.localModule.* instead of orpc.module.*) and back link.
    kind?: "module" | "local";
    // Where "← Modules" / delete-then-redirect point. Defaults to the
    // DB-backed modules list.
    backHref?: string;
    // True for a local module viewed outside dev mode: the server
    // (app/router/localModules.ts's requireDev()) refuses local-module
    // writes there regardless, but disabling Save/Delete and the name/
    // active fields here means the person sees why up front instead of
    // hitting a 403 after editing.
    readOnly?: boolean;
}

function newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function outputHandlePosition(node: ModuleNode, handle: string | null) {
    const def = NODE_DEFS[node.type];
    if (def.kind === "branch") {
        const y = handle === "false" ? node.y + NODE_HEIGHT * 0.75 : node.y + NODE_HEIGHT * 0.28;
        return { x: node.x + NODE_WIDTH, y };
    }
    return { x: node.x + NODE_WIDTH, y: node.y + NODE_HEIGHT / 2 };
}

function inputHandlePosition(node: ModuleNode) {
    return { x: node.x, y: node.y + NODE_HEIGHT / 2 };
}

function edgePathD(x1: number, y1: number, x2: number, y2: number) {
    const dx = Math.max(40, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function ModuleEditor({ module, kind = "module", backHref = "/d/modules", readOnly = false }: ModuleEditorProps) {
    const router = useRouter();
    const canvasRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<ModuleNode[]>(module.nodes);
    // Anchor-based instead of a single offset: startPositions snapshots
    // every selected node's x/y the moment the drag begins, so onMove
    // below can apply the same delta (current canvas point minus
    // startX/startY) to the whole group at once and keep them moving
    // together, rigidly, regardless of which one is being dragged.
    const dragRef = useRef<{ anchorId: string; startX: number; startY: number; startPositions: Map<string, { x: number; y: number }> } | null>(null);
    const connectRef = useRef<{ fromId: string; handle: string | null } | null>(null);
    // Rubber-band/marquee selection — set on canvas-background mousedown,
    // read by the window-level mousemove/mouseup below (see marqueeRect
    // state, which is just this ref's live rectangle for rendering).
    const marqueeRef = useRef<{ startX: number; startY: number; additive: boolean } | null>(null);
    // Drag-to-resize for the two annotation nodes (Group Box, Comment) —
    // set on their corner grip's mousedown, read by the same window-level
    // mousemove/mouseup as dragRef/marqueeRef/connectRef above. Only ever
    // targets a single node (resizing a multi-selection isn't supported).
    const resizeRef = useRef<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
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

    const [name, setName] = useState(module.name);
    const [active, setActive] = useState(module.active);
    const [nodes, setNodes] = useState<ModuleNode[]>(module.nodes);
    const [edges, setEdges] = useState<ModuleEdge[]>(module.edges);
    // Grows on scroll (see handleCanvasScroll below) instead of staying
    // fixed — canvasSizeRef mirrors it for the mousemove/mouseup
    // listeners below, which are attached once and would otherwise read
    // a stale size from their first render.
    const [canvasSize, setCanvasSize] = useState({ width: INITIAL_CANVAS_WIDTH, height: INITIAL_CANVAS_HEIGHT });
    const canvasSizeRef = useRef(canvasSize);
    canvasSizeRef.current = canvasSize;
    // The set of selected node ids — plain click replaces it with a
    // single id, shift/cmd/ctrl-click toggles a node in or out of it, and
    // dragging a rectangle across empty canvas (see marqueeRect) selects
    // everything it touches. The Inspector shows the full per-field editor
    // only when exactly one node is selected (selectedNode below); with
    // zero or several it shows a lighter "N selected" summary instead.
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [connectingLine, setConnectingLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [origin, setOrigin] = useState("");
    const [lists, setLists] = useState<{ _id: string; name: string; fields?: { key: string; label: string; type: string }[] }[] | null>(null);
    const [callableModules, setCallableModules] = useState<{ _id: string; name: string; functions: { id: string; name: string }[] }[] | null>(
        null,
    );
    const [webhookTargets, setWebhookTargets] = useState<
        { moduleId: string; moduleName: string; nodeId: string; path: string; method: string }[] | null
    >(null);
    const [nodeQuery, setNodeQuery] = useState("");
    const [openCategories, setOpenCategories] = useState<Set<ModuleNodeCategory>>(() => new Set([CATEGORY_ORDER[0]]));

    nodesRef.current = nodes;

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    // Backs any field with `dynamicOptions: "lists"` (the List and Count
    // nodes' "List" picker) as well as Project's findFields lookup below,
    // which resolves a chained Find node's list to know what fields it
    // can offer. Fetched once up front rather than lazily per-node so
    // switching between nodes doesn't re-fetch or flash empty.
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

    // Backs the Call node's "another module" picker — only modules
    // with a public Function node and no Webhook node come back (see
    // `listCallable` in app/router/modules.ts). Fetched once up front,
    // same as Lists above, so switching between nodes doesn't re-fetch.
    useEffect(() => {
        (async () => {
            try {
                const data = await withAuthRetry(() => orpc.module.listCallable());
                setCallableModules(data as any[]);
            } catch {
                setCallableModules([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Backs the Route and Forward nodes' "webhook to target" picker — a
    // flat list of every Webhook node across the person's own modules
    // (see `listWebhooks` in app/router/modules.ts).
    useEffect(() => {
        (async () => {
            try {
                const data = await withAuthRetry(() => orpc.module.listWebhooks());
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
            if (resizeRef.current) {
                const { x, y } = canvasPoint(e);
                const { id, startX, startY, startWidth, startHeight } = resizeRef.current;
                const dx = x - startX;
                const dy = y - startY;
                setNodes((prev) =>
                    prev.map((n) => {
                        if (n.id !== id) return n;
                        const maxWidth = Math.max(ANNOTATION_MIN_WIDTH, canvasSizeRef.current.width - n.x);
                        const maxHeight = Math.max(ANNOTATION_MIN_HEIGHT, canvasSizeRef.current.height - n.y);
                        const width = Math.round(Math.max(ANNOTATION_MIN_WIDTH, Math.min(maxWidth, startWidth + dx)));
                        const height = Math.round(Math.max(ANNOTATION_MIN_HEIGHT, Math.min(maxHeight, startHeight + dy)));
                        return { ...n, data: { ...n.data, width: String(width), height: String(height) } };
                    }),
                );
                setDirty(true);
                return;
            }

            if (dragRef.current) {
                const { x, y } = canvasPoint(e);
                const { startX, startY, startPositions } = dragRef.current;
                const dx = x - startX;
                const dy = y - startY;
                setNodes((prev) =>
                    prev.map((n) => {
                        const start = startPositions.get(n.id);
                        if (!start) return n;
                        const size = nodeSize(n);
                        return {
                            ...n,
                            x: Math.max(0, Math.min(canvasSizeRef.current.width - size.width, start.x + dx)),
                            y: Math.max(0, Math.min(canvasSizeRef.current.height - size.height, start.y + dy)),
                        };
                    }),
                );
                setDirty(true);
                return;
            }

            if (marqueeRef.current) {
                const { x, y } = canvasPoint(e);
                const { startX, startY } = marqueeRef.current;
                setMarqueeRect({
                    x: Math.min(startX, x),
                    y: Math.min(startY, y),
                    width: Math.abs(x - startX),
                    height: Math.abs(y - startY),
                });
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
            if (resizeRef.current) {
                resizeRef.current = null;
            }
            if (dragRef.current) {
                dragRef.current = null;
            }

            if (marqueeRef.current) {
                const { x, y } = canvasPoint(e);
                const { startX, startY, additive } = marqueeRef.current;
                const left = Math.min(startX, x);
                const right = Math.max(startX, x);
                const top = Math.min(startY, y);
                const bottom = Math.max(startY, y);
                // A marquee under ~4px is a click that barely moved, not a
                // drag — selection was already cleared (or left alone, for
                // an additive click) on mousedown, so there's nothing more
                // to do here.
                if (right - left > 4 || bottom - top > 4) {
                    const touched = nodesRef.current.filter((n) => {
                        const size = nodeSize(n);
                        return n.x < right && n.x + size.width > left && n.y < bottom && n.y + size.height > top;
                    });
                    setSelectedIds((prev) => {
                        const next = additive ? new Set(prev) : new Set<string>();
                        touched.forEach((n) => next.add(n.id));
                        return next;
                    });
                }
                marqueeRef.current = null;
                setMarqueeRect(null);
            }

            if (connectRef.current) {
                const { fromId, handle } = connectRef.current;
                const { x, y } = canvasPoint(e);
                const target = nodesRef.current.find((n) => {
                    if (n.id === fromId) return false;
                    const targetKind = NODE_DEFS[n.type].kind;
                    if (targetKind === "trigger" || targetKind === "annotation") return false;
                    const size = nodeSize(n);
                    return x >= n.x - 14 && x <= n.x + size.width + 14 && y >= n.y - 14 && y <= n.y + size.height + 14;
                });
                if (target) {
                    // A handle can fan out to more than one target now (e.g.
                    // an Input Form node feeding both a "Save to Database"
                    // node and a "Static Page" node in parallel) — so this
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

    // Delete/Backspace removes every selected node (one or many), as long
    // as the person isn't typing in a field — otherwise Backspace while
    // editing a text field would delete the node(s) out from under them.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key !== "Delete" && e.key !== "Backspace") return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            const isEditable = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!target?.isContentEditable;
            if (isEditable || selectedIds.size === 0) return;
            e.preventDefault();
            deleteNodes(Array.from(selectedIds));
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selectedIds]);

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
        if (readOnly) return;
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

    function handleNodeMouseDown(e: React.MouseEvent, node: ModuleNode) {
        e.stopPropagation();
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        let nextSelected: Set<string>;
        if (additive) {
            nextSelected = new Set(selectedIds);
            if (nextSelected.has(node.id)) nextSelected.delete(node.id);
            else nextSelected.add(node.id);
        } else if (selectedIds.has(node.id) && selectedIds.size > 1) {
            // Pressing down on a node that's already part of a multi-select
            // keeps the whole group selected, so the drag below (if any)
            // carries every selected node along with it instead of
            // collapsing the selection down to just this one.
            nextSelected = selectedIds;
        } else {
            nextSelected = new Set([node.id]);
        }
        setSelectedIds(nextSelected);
        if (readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + canvas.scrollLeft;
        const y = e.clientY - rect.top + canvas.scrollTop;
        const startPositions = new Map(
            Array.from(nextSelected)
                .map((id) => nodesRef.current.find((n) => n.id === id))
                .filter((n): n is ModuleNode => !!n)
                .map((n) => [n.id, { x: n.x, y: n.y }]),
        );
        dragRef.current = { anchorId: node.id, startX: x, startY: y, startPositions };
    }

    // Mousedown on empty canvas (nodes stop propagation, so this only
    // fires for background clicks) starts a marquee selection. A plain
    // click clears the current selection immediately, the same as
    // before; a shift/cmd/ctrl-click leaves it alone so the marquee can
    // add to it. Either way, onUp above turns the drag into a selection
    // once it's grown past a few px.
    function handleCanvasMouseDown(e: React.MouseEvent) {
        if (readOnly) {
            setSelectedIds(new Set());
            return;
        }
        const additive = e.shiftKey || e.metaKey || e.ctrlKey;
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            marqueeRef.current = { startX: x, startY: y, additive };
        }
        if (!additive) setSelectedIds(new Set());
    }

    function handleOutputMouseDown(e: React.MouseEvent, node: ModuleNode, handle: string | null) {
        e.stopPropagation();
        e.preventDefault();
        if (readOnly) return;
        connectRef.current = { fromId: node.id, handle };
        const from = outputHandlePosition(node, handle);
        setConnectingLine({ x1: from.x, y1: from.y, x2: from.x, y2: from.y });
    }

    // Bottom-right corner grip on Group Box / Comment cards — the only
    // two node types with a user-resizable footprint (see nodeSize()
    // above). Selects just this node (dragging its own resize handle
    // isn't a group operation) and hands off to resizeRef, read by the
    // window-level onMove/onUp in the effect above.
    function handleResizeMouseDown(e: React.MouseEvent, node: ModuleNode) {
        e.stopPropagation();
        e.preventDefault();
        if (readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        setSelectedIds(new Set([node.id]));
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + canvas.scrollLeft;
        const y = e.clientY - rect.top + canvas.scrollTop;
        const size = nodeSize(node);
        resizeRef.current = { id: node.id, startX: x, startY: y, startWidth: size.width, startHeight: size.height };
    }

    function addNode(type: ModuleNodeType) {
        if (readOnly) return;
        const def = NODE_DEFS[type];
        const data = def.defaultData();
        const size = nodeSize({ type, data });

        // Drop the new node in the middle of whatever's currently
        // scrolled into view, not a fixed spot on the (much larger)
        // canvas — otherwise "Add node" on a canvas someone has scrolled
        // around in lands the node off-screen. Falls back to the fixed
        // top-left-ish spot below if the canvas hasn't mounted yet.
        let x = 60;
        let y = 60;
        const canvas = canvasRef.current;
        if (canvas) {
            x = canvas.scrollLeft + canvas.clientWidth / 2 - size.width / 2;
            y = canvas.scrollTop + canvas.clientHeight / 2 - size.height / 2;
        }
        // Small stagger so adding several nodes in a row without moving
        // the viewport doesn't stack them exactly on top of each other.
        const stackIndex = nodes.length % 6;
        x += (stackIndex % 3) * 28;
        y += Math.floor(stackIndex / 3) * 28;

        x = Math.max(0, Math.min(canvasSize.width - size.width, x));
        y = Math.max(0, Math.min(canvasSize.height - size.height, y));

        const node: ModuleNode = {
            id: newId("n"),
            type,
            x,
            y,
            data,
        };
        setNodes((prev) => [...prev, node]);
        setSelectedIds(new Set([node.id]));
        setDirty(true);
    }

    // Removes one or more nodes at once — the per-node "×" button and the
    // Inspector's "Delete node" button both call this with a single id;
    // group delete (Delete/Backspace, or the Inspector's "Delete selected"
    // button when several nodes are selected) calls it with the whole
    // selection.
    function deleteNodes(nodeIds: string[]) {
        if (readOnly || nodeIds.length === 0) return;
        const idSet = new Set(nodeIds);
        setNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
        setEdges((prev) => prev.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
        setSelectedIds((prev) => {
            const next = new Set(prev);
            idSet.forEach((id) => next.delete(id));
            return next;
        });
        setDirty(true);
    }

    function deleteNode(nodeId: string) {
        deleteNodes([nodeId]);
    }

    // Copies one or more nodes — same type and data, offset slightly so
    // they don't land exactly on top of the originals — and selects the
    // new copies. Any edge that runs between two nodes that are *both*
    // being duplicated is copied along with them (so duplicating a
    // connected group keeps it wired together); edges to anything outside
    // the set are left behind, same as a single-node duplicate.
    function duplicateNodes(nodeIds: string[]) {
        if (readOnly || nodeIds.length === 0) return;
        const idSet = new Set(nodeIds);
        const sources = nodesRef.current.filter((n) => idSet.has(n.id));
        if (sources.length === 0) return;

        const idMap = new Map(sources.map((n) => [n.id, newId("n")]));
        const copies: ModuleNode[] = sources.map((source) => {
            const size = nodeSize(source);
            return {
                ...source,
                id: idMap.get(source.id)!,
                x: Math.max(0, Math.min(canvasSizeRef.current.width - size.width, source.x + 32)),
                y: Math.max(0, Math.min(canvasSizeRef.current.height - size.height, source.y + 32)),
                data: { ...source.data },
            };
        });
        const copiedEdges: ModuleEdge[] = edges
            .filter((e) => idMap.has(e.source) && idMap.has(e.target))
            .map((e) => ({ ...e, id: newId("e"), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));

        setNodes((prev) => [...prev, ...copies]);
        if (copiedEdges.length > 0) setEdges((prev) => [...prev, ...copiedEdges]);
        setSelectedIds(new Set(copies.map((n) => n.id)));
        setDirty(true);
    }

    function duplicateNode(nodeId: string) {
        duplicateNodes([nodeId]);
    }

    function updateNodeData(nodeId: string, key: string, value: string | boolean | Record<string, string>) {
        if (readOnly) return;
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n)));
        setDirty(true);
    }

    // Same as updateNodeData, but for pickers that need to set several
    // keys together as one change — e.g. picking a Call node's function
    // sets both `functionId` and a denormalized `functionName` in one go,
    // so the node card never shows one without the other mid-update.
    function updateNodeDataMulti(nodeId: string, patch: Record<string, string>) {
        if (readOnly) return;
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
        setDirty(true);
    }

    // Merges a single child's position into a View node's data.layout —
    // keyed by the child node's id, so it survives independently of the
    // order blocks were connected in. See the "Layout" section of the
    // inspector below and lib/nodes/view.ts (the server-side reader).
    function updateViewLayout(viewNodeId: string, childId: string, patch: ViewLayoutEntry) {
        if (readOnly) return;
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
        if (readOnly) return;
        setEdges((prev) => prev.filter((e) => e.id !== edgeId));
        setDirty(true);
    }

    // Makes the canvas feel infinite: scrolling near the current
    // right/bottom edge grows the workspace further in that direction
    // instead of just hitting a hard stop. Capped at CANVAS_MAX_SIZE so
    // it can't runaway-grow into something slow to render.
    function handleCanvasScroll(e: React.UIEvent<HTMLDivElement>) {
        const el = e.currentTarget;
        const nearRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - CANVAS_GROW_THRESHOLD;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - CANVAS_GROW_THRESHOLD;
        if (!nearRight && !nearBottom) return;
        setCanvasSize((prev) => {
            const width = nearRight ? Math.min(CANVAS_MAX_SIZE, prev.width + CANVAS_GROW_STEP) : prev.width;
            const height = nearBottom ? Math.min(CANVAS_MAX_SIZE, prev.height + CANVAS_GROW_STEP) : prev.height;
            if (width === prev.width && height === prev.height) return prev;
            return { width, height };
        });
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        setSaved(false);
        try {
            if (kind === "local") {
                await withAuthRetry(() =>
                    orpc.localModule.update({ id: module._id, name: name.trim() || module._id, active, nodes, edges }),
                );
            } else {
                await withAuthRetry(() =>
                    orpc.module.update({ id: module._id, name: name.trim() || "Untitled module", active, nodes, edges }),
                );
            }
            setDirty(false);
            setSaved(true);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : `Couldn't save the ${kind === "local" ? "local module" : "module"}.`);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        const label = kind === "local" ? "local module file" : "module";
        if (!confirm(`Delete this ${label}? This can't be undone.`)) return;
        setDeleting(true);
        try {
            if (kind === "local") {
                await withAuthRetry(() => orpc.localModule.remove({ id: module._id }));
            } else {
                await withAuthRetry(() => orpc.module.remove({ id: module._id }));
            }
            router.push(backHref);
        } catch (err) {
            setError(err instanceof ORPCError ? err.message : `Couldn't delete the ${label}.`);
            setDeleting(false);
        }
    }

    // Downloads the module's current editor state (not necessarily
    // saved yet) as a standalone JSON file. Deliberately omits `_id` —
    // the matching Import (coming next) creates a brand-new module from
    // this file rather than overwriting one, so a stale id would be
    // misleading here.
    function handleExport() {
        const exportData = { name, active, nodes, edges };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = (name.trim() || "module").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "module";
        a.href = url;
        a.download = `${slug}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Same idea as handleExport, but scoped to only the selected nodes —
    // and whatever edges run strictly between them, so re-importing the
    // file doesn't produce edges pointing at nodes that didn't come
    // along. Shows up next to Export as soon as anything is selected.
    function handleExportSelected() {
        const selNodes = nodes.filter((n) => selectedIds.has(n.id));
        if (selNodes.length === 0) return;
        const selNodeIds = new Set(selNodes.map((n) => n.id));
        const selEdges = edges.filter((e) => selNodeIds.has(e.source) && selNodeIds.has(e.target));
        const exportData = { nodes: selNodes, edges: selEdges };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const slug = (name.trim() || "module").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "module";
        a.href = url;
        a.download = `${slug}-selection.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    const selectedNode = selectedIds.size === 1 ? nodes.find((n) => selectedIds.has(n.id)) ?? null : null;

    const q = nodeQuery.trim().toLowerCase();
    const hasQuery = q.length > 0;

    // Every node grouped under its category, in palette order. While
    // searching, a category's list is narrowed to its matches — the
    // category itself stays visible only if it has at least one.
    const categorizedNodes = CATEGORY_ORDER.map((category) => {
        const types = NODE_ORDER.filter((type) => NODE_CATEGORIES[type] === category);
        const visible = hasQuery
            ? types.filter((type) => {
                  const def = NODE_DEFS[type];
                  return def.label.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
              })
            : types;
        return { category, types: visible };
    });
    const totalMatches = categorizedNodes.reduce((sum, c) => sum + c.types.length, 0);

    // A category is open if the person opened it manually, OR — while
    // searching — if it has a match. That second half is what makes a
    // match "jump out" of a folded section without the person having to
    // find and open it themselves.
    function isCategoryOpen(category: ModuleNodeCategory) {
        if (hasQuery) return categorizedNodes.find((c) => c.category === category)!.types.length > 0;
        return openCategories.has(category);
    }

    function toggleCategory(category: ModuleNodeCategory) {
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
                <Link href={backHref} className="text-sm text-neutral-500 hover:text-neutral-900">
                    ← {kind === "local" ? "Local modules" : "Modules"}
                </Link>
                <Input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                    }}
                    disabled={readOnly}
                    className="h-8 max-w-xs font-medium"
                />
                <div className="inline-flex items-center gap-2 px-1 text-xs font-medium">
                    <Switch
                        checked={active}
                        onCheckedChange={(checked) => {
                            setActive(checked);
                            setDirty(true);
                        }}
                        disabled={readOnly}
                        aria-label={active ? "Module is active" : "Module is inactive"}
                    />
                    <span className={active ? "text-emerald-700" : "text-neutral-500"}>{active ? "Active" : "Inactive"}</span>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {error && <span className="text-sm text-destructive">{error}</span>}
                    {!error && saved && !dirty && <span className="text-sm text-neutral-400">Saved</span>}
                    {dirty && !saving && !readOnly && <span className="text-sm text-neutral-400">Unsaved changes</span>}
                    {selectedIds.size > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={handleExportSelected}>
                            Export selected ({selectedIds.size})
                        </Button>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={handleExport}>
                        Export
                    </Button>
                    {!readOnly && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Deleting…" : "Delete"}
                        </Button>
                    )}
                    {!readOnly && (
                        <Button type="button" size="sm" onClick={handleSave} disabled={saving || !dirty}>
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    )}
                </div>
            </div>

            {readOnly && (
                <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
                    Running in production mode — this local module is read-only. It was fixed at publish time; switch to dev mode to
                    change it.
                </p>
            )}

            <div className="flex min-h-0 flex-1">
                {/* Palette */}
                <div className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-neutral-200">
                    {/* This header (title + search) has no scroll behavior
                        of its own, so it stays put while the category
                        list below it scrolls — "on top, not moving". */}
                    <div className="shrink-0 border-b border-neutral-200 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Add node</p>
                        <Input type="text" value={nodeQuery} onChange={(e) => setNodeQuery(e.target.value)} placeholder="Search nodes…" />
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-2">
                        {categorizedNodes.map(({ category, types }) => {
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
                        {hasQuery && totalMatches === 0 && <p className="px-2 py-4 text-xs text-neutral-400">No nodes match "{nodeQuery}".</p>}
                    </div>
                </div>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onScroll={handleCanvasScroll}
                    // min-w-0/min-h-0 matter here: without them, a flex
                    // item won't shrink below its content's natural size,
                    // which was silently defeating overflow-auto and
                    // making this pane grow instead of scroll.
                    className="relative min-h-0 min-w-0 flex-1 overflow-auto bg-neutral-50"
                    style={{
                        backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                    }}
                >
                    <div style={{ width: canvasSize.width, height: canvasSize.height, position: "relative" }}>
                        <svg width={canvasSize.width} height={canvasSize.height} className="pointer-events-none absolute left-0 top-0">
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

                        {marqueeRect && (
                            <div
                                className="pointer-events-none absolute rounded-sm border border-neutral-900/40 bg-neutral-900/10"
                                style={{ left: marqueeRect.x, top: marqueeRect.y, width: marqueeRect.width, height: marqueeRect.height }}
                            />
                        )}

                        {[...nodes].sort((a, b) => (a.type === "box" ? -1 : 0) - (b.type === "box" ? -1 : 0)).map((node) => {
                            const def = NODE_DEFS[node.type];
                            const isSelected = selectedIds.has(node.id);
                            const size = nodeSize(node);
                            const isAnnotation = def.kind === "annotation";

                            if (node.type === "comment") {
                                const palette = commentColors(node.data);
                                return (
                                    <div
                                        key={node.id}
                                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                        className={`absolute select-none rounded-lg border shadow-sm ${isSelected ? "ring-1" : ""} cursor-grab active:cursor-grabbing`}
                                        style={{
                                            left: node.x,
                                            top: node.y,
                                            width: size.width,
                                            height: size.height,
                                            backgroundColor: palette.bg,
                                            borderColor: isSelected ? palette.selectedBorder : palette.border,
                                            ...(isSelected ? ({ "--tw-ring-color": palette.selectedBorder } as React.CSSProperties) : {}),
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2 px-2.5 pt-2">
                                            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: palette.label }}>
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: def.color }} />
                                                Comment
                                            </span>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => deleteNode(node.id)}
                                                className="shrink-0 hover:text-destructive"
                                                style={{ color: palette.placeholder }}
                                                aria-label="Delete node"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div
                                            className="h-[calc(100%-28px)] overflow-hidden whitespace-pre-wrap break-words px-2.5 pb-2 pt-1 text-xs"
                                            style={{ color: palette.text }}
                                        >
                                            {node.data?.text ? (
                                                String(node.data.text)
                                            ) : (
                                                <span style={{ color: palette.placeholder }}>Empty comment</span>
                                            )}
                                        </div>
                                        <div
                                            data-resize-handle
                                            onMouseDown={(e) => handleResizeMouseDown(e, node)}
                                            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
                                            title="Drag to resize"
                                        >
                                            <svg viewBox="0 0 10 10" className="h-full w-full p-0.5" style={{ color: palette.selectedBorder, opacity: 0.6 }}>
                                                <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            }

                            if (node.type === "box") {
                                return (
                                    <div
                                        key={node.id}
                                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                        className={`absolute cursor-grab select-none rounded-lg border-2 border-dashed bg-neutral-50/60 active:cursor-grabbing ${
                                            isSelected ? "border-neutral-500" : "border-neutral-300"
                                        }`}
                                        style={{ left: node.x, top: node.y, width: size.width, height: size.height }}
                                    >
                                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                                            <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-neutral-600">
                                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: def.color }} />
                                                <span className="truncate">{node.data?.title || "Untitled group"}</span>
                                            </span>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onClick={() => deleteNode(node.id)}
                                                className="shrink-0 text-neutral-300 hover:text-destructive"
                                                aria-label="Delete node"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div
                                            data-resize-handle
                                            onMouseDown={(e) => handleResizeMouseDown(e, node)}
                                            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize text-neutral-400 hover:text-neutral-600"
                                            title="Drag to resize"
                                        >
                                            <svg viewBox="0 0 10 10" className="h-full w-full p-0.5">
                                                <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={node.id}
                                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                                    className={`absolute cursor-grab select-none rounded-lg border bg-white shadow-sm active:cursor-grabbing ${
                                        isSelected ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                                    }`}
                                    style={{ left: node.x, top: node.y, width: size.width, minHeight: size.height }}
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
                                            aria-label="Delete node"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="truncate px-3 py-2 text-xs text-neutral-500">{def.summarize(node.data ?? {})}</div>

                                    {def.kind !== "trigger" && !isAnnotation && (
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
                                    ) : def.kind !== "terminal" && !isAnnotation ? (
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
                    {selectedIds.size > 1 ? (
                        // Several nodes selected at once (shift-click, or
                        // a marquee drag across empty canvas) — no
                        // per-field editor for a mixed set, just the
                        // group actions. Dragging any one of the selected
                        // nodes on the canvas moves all of them together.
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">{selectedIds.size} nodes selected</p>
                                <p className="text-xs text-neutral-500">
                                    Drag any of them to move the whole group. Shift-click a node to add or remove it from the
                                    selection.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => duplicateNodes(Array.from(selectedIds))}>
                                    Duplicate selected
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => deleteNodes(Array.from(selectedIds))}>
                                    Delete selected
                                </Button>
                            </div>
                        </div>
                    ) : !selectedNode ? (
                        <p className="text-sm text-neutral-400">
                            Select a node to edit it, or drag from the dot on its right edge to connect it to another node. Drag from the same dot again to
                            fan out to a second node — both run in parallel.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">{NODE_DEFS[selectedNode.type].label}</p>
                                <p className="text-xs text-neutral-500">{NODE_DEFS[selectedNode.type].description}</p>
                            </div>

                            {NODE_DEFS[selectedNode.type].fields.map((field) => {
                                // The field-selection checkboxes live on Project and on
                                // Pass Through's "Fields to keep" — both read the list
                                // schema off whichever data node feeds them, walking back
                                // through any pass-through pipeline nodes in between to
                                // find the actual source: List (by id) or List (create if
                                // not exists)/Query (by name-match against your Lists).
                                // Project uses the result to filter `selectedFields`; Pass
                                // Through uses the identical lookup purely to offer field
                                // names to snapshot into `keptFields` — see
                                // lib-server/nodes/passThrough.ts.
                                //
                                // Find and Find One are pass-through for this purpose,
                                // NOT a source, even though they're the node you'd
                                // typically chain Project from: their own node-def has
                                // `fields: []` (see lib/node-defs/find.ts /
                                // findOne.ts) — they carry no list id/name of their
                                // own and only ever inherit the list from whichever
                                // List/List-upsert/Query node feeds *them* at runtime.
                                // Treating them as a terminal source here meant reading
                                // `sourceNode.data.list` off a node that never has that
                                // field, so Find → Match → Project (the documented
                                // pattern) never resolved any fields.
                                if (
                                    field.kind === "select" &&
                                    field.dynamicOptions === "findFields" &&
                                    (selectedNode.type === "project" || selectedNode.type === "passThrough")
                                ) {
                                    const PASSTHROUGH_TYPES: ModuleNodeType[] = ["match", "sort", "limit", "skip", "passThrough", "find", "findOne"];
                                    const ID_SOURCE_TYPES: ModuleNodeType[] = ["list"];
                                    const NAME_SOURCE_TYPES: ModuleNodeType[] = ["query", "listUpsert"];

                                    let sourceNode: ModuleNode | null = null;
                                    let cursorId: string | null = selectedNode.id;
                                    const visited = new Set<string>();
                                    while (cursorId && !visited.has(cursorId)) {
                                        visited.add(cursorId);
                                        const edge = edges.find((e) => e.target === cursorId);
                                        const upstream = edge ? nodes.find((n) => n.id === edge.source) : undefined;
                                        if (!upstream) break;
                                        if (ID_SOURCE_TYPES.includes(upstream.type) || NAME_SOURCE_TYPES.includes(upstream.type)) {
                                            sourceNode = upstream;
                                            break;
                                        }
                                        if (PASSTHROUGH_TYPES.includes(upstream.type)) {
                                            cursorId = upstream.id;
                                            continue;
                                        }
                                        break;
                                    }

                                    const findNode = sourceNode;
                                    const findList: { _id: string; name: string; fields?: { key: string; label: string; type: string }[] } | undefined = (() => {
                                        if (!sourceNode) return undefined;
                                        if (ID_SOURCE_TYPES.includes(sourceNode.type)) {
                                            return lists?.find((l) => l._id === sourceNode!.data?.list);
                                        }
                                        // Query names its list via data.listName; List
                                        // (create if not exists) via data.name — same
                                        // case-insensitive match either way.
                                        const name = String(sourceNode.data?.listName ?? sourceNode.data?.name ?? "").trim().toLowerCase();
                                        return name ? lists?.find((l) => l.name.trim().toLowerCase() === name) : undefined;
                                    })();

                                    const noListMessage = sourceNode && NAME_SOURCE_TYPES.includes(sourceNode.type) ? "No list matches that name" : "No list selected";

                                    const selectedFields = (() => {
                                        try {
                                            return JSON.parse(selectedNode.data?.[field.key] ?? "[]");
                                        } catch {
                                            return [];
                                        }
                                    })();

                                    // Project needs a real List schema to filter safely — a
                                    // typo'd field name there just silently drops that field
                                    // from every result. Pass Through has no such downside
                                    // (it only ever snapshots what's actually there — see
                                    // lib-server/nodes/passThrough.ts's readPath), so it
                                    // still works with no List anywhere in the chain, e.g.
                                    // right off a Function's input parameters or a Webhook's
                                    // body: same as Console Log needing no config to show
                                    // whatever's on ctx.body, Pass Through lets you just type
                                    // the field name(s) you know are there.
                                    const manualEntrySupported = selectedNode.type === "passThrough";

                                    return (
                                        <div key={field.key} className="flex flex-col gap-3">
                                            <Label>{field.label}</Label>
                                            {!findNode && manualEntrySupported ? (
                                                <div className="flex flex-col gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={selectedFields.join(", ")}
                                                        onChange={(e) => {
                                                            const updated = e.target.value
                                                                .split(",")
                                                                .map((f) => f.trim())
                                                                .filter(Boolean);
                                                            updateNodeData(selectedNode.id, field.key, JSON.stringify(updated));
                                                        }}
                                                        placeholder="e.g. userId, email"
                                                        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    />
                                                    <p className="text-xs text-neutral-500">
                                                        No List in this chain to read field names from — type the ones you know are there
                                                        (comma-separated), e.g. whatever a Call node passed in from a Function's caller.
                                                    </p>
                                                </div>
                                            ) : !findNode ? (
                                                <p className="text-sm text-neutral-500">
                                                    Chain from a List, List (create if not exists), or Query node — Find/Find One/Match/Sort/Limit/Skip in
                                                    between are fine too — to see fields
                                                </p>
                                            ) : !findList ? (
                                                <p className="text-sm text-neutral-500">{noListMessage}</p>
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

                                // Random's Length/Min/Max/Custom characters fields only make
                                // sense for their own mode — Number describes a numeric range
                                // (Min/Max), the other three modes describe a string length
                                // (Length), and Custom additionally needs its own character
                                // pool. Hide whichever of these don't apply to the current mode
                                // rather than showing every field at once.
                                if (selectedNode.type === "random") {
                                    const mode = selectedNode.data?.mode ?? "both";
                                    if (field.key === "length" && mode === "number") return null;
                                    if ((field.key === "min" || field.key === "max") && mode !== "number") return null;
                                    if (field.key === "customChars" && mode !== "custom") return null;
                                }

                                // Condition's "Exists" operator only checks whether the field
                                // has a value at all — there's nothing to compare it against,
                                // so the Value box is just noise once that's selected.
                                if (selectedNode.type === "condition" && field.key === "value" && selectedNode.data?.operator === "exists") {
                                    return null;
                                }

                                // State's Mapping field only makes sense once something is
                                // actually feeding this node data to map — with no incoming
                                // edge there's nothing to pull {{field}} values from, so hide
                                // it rather than show a mapping box that can't do anything.
                                if (selectedNode.type === "state" && field.key === "mapping") {
                                    const hasInput = edges.some((e) => e.target === selectedNode.id);
                                    if (!hasInput) {
                                        return (
                                            <div key={field.key} className="flex flex-col gap-1.5">
                                                <Label>{field.label}</Label>
                                                <p className="text-sm text-neutral-500">Chain a node into this State node to map its data.</p>
                                            </div>
                                        );
                                    }
                                }

                                if (field.kind === "toggle") {
                                    const checked = selectedNode.data?.[field.key] !== false;
                                    return (
                                        <div key={field.key} className="flex items-center justify-between gap-2">
                                            <Label htmlFor={field.key}>{field.label}</Label>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id={field.key}
                                                    checked={checked}
                                                    onCheckedChange={(next) => updateNodeData(selectedNode.id, field.key, next)}
                                                    aria-label={`${field.label}: ${checked ? "on" : "off"}`}
                                                />
                                                <span className={cn("text-xs font-medium", checked ? "text-emerald-700" : "text-neutral-500")}>
                                                    {checked ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </div>
                                    );
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

                            {(() => {
                                // Any node reached by more than one distinct
                                // predecessor is a *join* — see the
                                // `incomingSources`/`joinStates` handling in
                                // lib-server/moduleEngine.ts. Surfaced here for
                                // every node type (not just Mapper) since the
                                // engine treats it generically.
                                const incomingIds = Array.from(
                                    new Set(edges.filter((e) => e.target === selectedNode.id).map((e) => e.source)),
                                );
                                if (incomingIds.length < 2 || selectedNode.type === "add") return null;
                                const incomingNodes = incomingIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is ModuleNode => Boolean(n));
                                const joinMode = selectedNode.data?.joinMode === "wait" ? "wait" : "continue";

                                return (
                                    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
                                        <div>
                                            <Label>Multiple inputs</Label>
                                            <p className="text-xs text-neutral-500">
                                                This node is fed by {incomingIds.length} other nodes. Choose how it should handle that:
                                            </p>
                                        </div>
                                        <select
                                            value={joinMode}
                                            onChange={(e) => updateNodeData(selectedNode.id, "joinMode", e.target.value)}
                                            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                        >
                                            <option value="continue">Continue after the first input arrives (runs once per input, like today)</option>
                                            <option value="wait">Wait for every input, then run once with all of them combined</option>
                                        </select>
                                        {joinMode === "wait" && (
                                            <div className="rounded-md bg-neutral-50 p-2">
                                                {selectedNode.type === "mapper" ? (
                                                    <p className="text-xs text-neutral-500">
                                                        Mapper combines every input into a single object before mapping, so just use{" "}
                                                        <code className="font-mono">{"{{field}}"}</code>. If two inputs share a field name, whichever
                                                        one arrives last wins — there's no need to reference a source node's id.
                                                    </p>
                                                ) : selectedNode.type === "condition" ? (
                                                    <p className="text-xs text-neutral-500">
                                                        Condition combines every input into a single object before checking it, so the Field box can
                                                        just use e.g. <code className="font-mono">status</code>. If two inputs share a field name,
                                                        whichever one arrives last wins — there's no need to reference a source node's id.
                                                    </p>
                                                ) : selectedNode.type === "saveToList" ? (
                                                    <p className="text-xs text-neutral-500">
                                                        Save to List combines every input into a single object. It extracts list metadata (listId, fields) from one input and data fields from all inputs, then saves the data to the list. Typically: connect a List node and a Form/Mapper node, both feeding into Save to List with wait mode.
                                                    </p>
                                                ) : (
                                                    <>
                                                        <p className="text-xs text-neutral-500">
                                                            Each input is namespaced by its source node's id, so use{" "}
                                                            <code className="font-mono">{"{{nodeId.field}}"}</code> to read a specific one:
                                                        </p>
                                                        <ul className="mt-1 flex flex-col gap-0.5">
                                                            {incomingNodes.map((n) => (
                                                                <li key={n.id} className="flex items-center gap-1.5 text-xs">
                                                                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: NODE_DEFS[n.type].color }} />
                                                                    <span className="text-neutral-700">{NODE_DEFS[n.type].label}</span>
                                                                    <code className="truncate font-mono text-neutral-400">{`{{${n.id}.…}}`}</code>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                )}
                                                <p className="mt-1 text-xs text-amber-600">
                                                    If one of these branches never actually fires this run (e.g. the untaken side of a Condition), this node
                                                    waits up to a few seconds before running anyway with whichever inputs did arrive.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {selectedNode.type === "add" &&
                                (() => {
                                    // Which UI applies depends on how many nodes are actually
                                    // wired into this Add node — see app/lib/node-defs/add.ts
                                    // and app/lib-server/nodes/add.ts for the matching runtime
                                    // behavior.
                                    const incomingIds = Array.from(new Set(edges.filter((e) => e.target === selectedNode.id).map((e) => e.source)));
                                    const incomingNodes = incomingIds.map((id) => nodes.find((n) => n.id === id)).filter((n): n is ModuleNode => Boolean(n));
                                    const data = selectedNode.data ?? {};

                                    if (incomingNodes.length >= 2) {
                                        const sumFields: Record<string, string> = data.sumFields ?? {};
                                        return (
                                            <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
                                                <div>
                                                    <Label>Fields to sum</Label>
                                                    <p className="text-xs text-neutral-500">
                                                        Fed by {incomingNodes.length} other nodes. Enter which field to read a number from for each
                                                        one — leave one blank to use that input's value itself.
                                                    </p>
                                                </div>
                                                {incomingNodes.map((n) => (
                                                    <div key={n.id} className="flex flex-col gap-1.5">
                                                        <Label htmlFor={`add-field-${n.id}`}>{`Field for ${NODE_DEFS[n.type].label}`}</Label>
                                                        <Input
                                                            id={`add-field-${n.id}`}
                                                            value={sumFields[n.id] ?? ""}
                                                            onChange={(e) => updateNodeData(selectedNode.id, "sumFields", { ...sumFields, [n.id]: e.target.value })}
                                                            placeholder="amount"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3">
                                            {incomingNodes.length === 1 && (
                                                <div className="flex flex-col gap-1.5">
                                                    <Label htmlFor="add-field">Field to read (optional)</Label>
                                                    <Input
                                                        id="add-field"
                                                        value={data.field ?? ""}
                                                        onChange={(e) => updateNodeData(selectedNode.id, "field", e.target.value)}
                                                        placeholder="amount"
                                                    />
                                                    <p className="text-xs text-neutral-500">
                                                        Leave blank to use {NODE_DEFS[incomingNodes[0].type].label}'s value itself.
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="add-number">Number to add</Label>
                                                <Input
                                                    id="add-number"
                                                    value={data.number ?? ""}
                                                    onChange={(e) => updateNodeData(selectedNode.id, "number", e.target.value)}
                                                    placeholder="1"
                                                />
                                                {incomingNodes.length === 0 && (
                                                    <p className="text-xs text-neutral-500">Nothing chained in yet — this just outputs the number entered here.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                            {selectedNode.type === "class" &&
                                (() => {
                                    // A Class node's own inspector is entirely dynamic: which
                                    // fields make sense depends on whatever this node's output
                                    // is wired into (drag from its dot onto a Label or a Div) —
                                    // see app/lib/node-defs/class.ts for why this isn't just a
                                    // normal `fields` list, and app/lib-server/nodes/class.ts +
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
                                                    Not connected yet. Drag from this node's output dot onto a Label, Div, or Image to see styling
                                                    options for it — the options shown here change depending which one it's wired into.
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
                                            ) : targetNode.type === "image" ? (
                                                <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-3">
                                                    <p className="text-xs font-medium text-neutral-500">Chained into an Image — size & fit</p>
                                                    {select("imgWidth", "Width", IMAGE_WIDTH_OPTIONS)}
                                                    {select("imgHeight", "Height", IMAGE_HEIGHT_OPTIONS)}
                                                    {select("objectFit", "Object fit", OBJECT_FIT_OPTIONS)}
                                                    {select("rounded", "Rounded corners", ROUNDED_OPTIONS)}
                                                    {select("shadow", "Shadow", SHADOW_OPTIONS)}
                                                    {select("margin", "Margin", MARGIN_OPTIONS)}
                                                    {toggle("border", "Border")}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-neutral-500">
                                                    Class nodes currently style a Label, Div, or Image — {NODE_DEFS[targetNode.type].label} isn't one
                                                    of those, so nothing here will apply to it.
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

                            {selectedNode.type === "style" &&
                                (() => {
                                    // Same wiring gesture as Class above, just simpler: Style
                                    // has no per-target field set (it's raw CSS, handled by the
                                    // generic textarea field rendered above), so all that's
                                    // custom here is telling the person what it's currently
                                    // wired into — see findChainedStyle/resolveStyleAttr in
                                    // lib-server/nodes/style.ts.
                                    const targetEdge = edges.find((e) => e.source === selectedNode.id);
                                    const targetNode = targetEdge ? nodes.find((n) => n.id === targetEdge.target) : null;

                                    return !targetNode ? (
                                        <p className="text-sm text-neutral-500">
                                            Not connected yet. Drag from this node's output dot onto a Label, Div, or Image to apply these CSS
                                            declarations to it via its inline style attribute.
                                        </p>
                                    ) : targetNode.type === "label" || targetNode.type === "div" || targetNode.type === "image" ? (
                                        <p className="text-xs text-neutral-500">
                                            Chained into a {NODE_DEFS[targetNode.type].label} — applied to its inline{" "}
                                            <code className="rounded bg-neutral-100 px-1 py-0.5">style</code> attribute.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-neutral-500">
                                            Style nodes currently apply to a Label, Div, or Image — {NODE_DEFS[targetNode.type].label} isn't one of
                                            those, so nothing here will apply to it.
                                        </p>
                                    );
                                })()}

                            {selectedNode.type === "call" &&
                                (() => {
                                    const scope = selectedNode.data?.scope === "external" ? "external" : "internal";
                                    const internalFunctions = nodes
                                        .filter((n) => n.type === "function" && n.id !== selectedNode.id)
                                        .map((n) => ({ id: n.id, name: n.data?.name ? String(n.data.name) : "Untitled function" }));
                                    const externalModule = callableModules?.find((w) => w._id === selectedNode.data?.moduleId);
                                    const functionOptions = scope === "internal" ? internalFunctions : externalModule?.functions ?? [];

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
                                                            moduleId: "",
                                                            moduleName: "",
                                                            functionId: "",
                                                            functionName: "",
                                                        })
                                                    }
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                >
                                                    <option value="internal">A function in this module</option>
                                                    <option value="external">A function in another module</option>
                                                </select>
                                            </div>

                                            {scope === "external" && (
                                                <div className="flex flex-col gap-1.5">
                                                    <Label htmlFor="call-module">Module</Label>
                                                    <select
                                                        id="call-module"
                                                        value={selectedNode.data?.moduleId ?? ""}
                                                        onChange={(e) => {
                                                            const wf = callableModules?.find((w) => w._id === e.target.value);
                                                            updateNodeDataMulti(selectedNode.id, {
                                                                moduleId: e.target.value,
                                                                moduleName: wf?.name ?? "",
                                                                functionId: "",
                                                                functionName: "",
                                                            });
                                                        }}
                                                        className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                        disabled={callableModules === null}
                                                    >
                                                        <option value="">
                                                            {callableModules === null
                                                                ? "Loading modules…"
                                                                : callableModules.length === 0
                                                                  ? "No modules with a public function yet"
                                                                  : "Select a module…"}
                                                        </option>
                                                        {callableModules?.map((w) => (
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
                                                    disabled={scope === "external" && !selectedNode.data?.moduleId}
                                                >
                                                    <option value="">
                                                        {scope === "internal"
                                                            ? internalFunctions.length === 0
                                                                ? "No Function nodes in this module"
                                                                : "Select a function…"
                                                            : !selectedNode.data?.moduleId
                                                              ? "Select a module first"
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
                                    const moduleOptions = Array.from(new Map((webhookTargets ?? []).map((t) => [t.moduleId, t.moduleName])).entries()).map(
                                        ([id, name]) => ({ id, name }),
                                    );
                                    const hooksForModule = (webhookTargets ?? []).filter((t) => t.moduleId === selectedNode.data?.moduleId);

                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="target-module">Module</Label>
                                                <select
                                                    id="target-module"
                                                    value={selectedNode.data?.moduleId ?? ""}
                                                    onChange={(e) => {
                                                        const opt = moduleOptions.find((w) => w.id === e.target.value);
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            moduleId: e.target.value,
                                                            moduleName: opt?.name ?? "",
                                                            webhookNodeId: "",
                                                            webhookPath: "",
                                                        });
                                                    }}
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    disabled={webhookTargets === null}
                                                >
                                                    <option value="">
                                                        {webhookTargets === null
                                                            ? "Loading modules…"
                                                            : moduleOptions.length === 0
                                                              ? "No modules with a webhook yet"
                                                              : "Select a module…"}
                                                    </option>
                                                    {moduleOptions.map((w) => (
                                                        <option key={w.id} value={w.id}>
                                                            {w.id === module._id ? `${w.name} (this module)` : w.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <Label htmlFor="target-webhook">Webhook node</Label>
                                                <select
                                                    id="target-webhook"
                                                    value={selectedNode.data?.webhookNodeId ?? ""}
                                                    onChange={(e) => {
                                                        const hook = hooksForModule.find((h) => h.nodeId === e.target.value);
                                                        updateNodeDataMulti(selectedNode.id, {
                                                            webhookNodeId: e.target.value,
                                                            webhookPath: hook?.path ?? "",
                                                        });
                                                    }}
                                                    className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                                                    disabled={!selectedNode.data?.moduleId}
                                                >
                                                    <option value="">
                                                        {!selectedNode.data?.moduleId ? "Select a module first" : "Select a webhook node…"}
                                                    </option>
                                                    {hooksForModule.map((h) => (
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
                                        .filter((n): n is ModuleNode => !!n && VIEW_BLOCK_TYPES.includes(n.type));
                                    const positions = new Map(children.map((child) => [child.id, { col: 0, span: 12, row: 0, height: "auto" as const, ...layout[child.id] }]));
                                    const maxRow = children.reduce((max, child) => Math.max(max, positions.get(child.id)!.row), 0);

                                    return (
                                        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 p-3">
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-900">Layout</p>
                                                <p className="text-xs text-neutral-500">
                                                    Connect a Menu, Tabs, Navbar, Footer, Table, Input Form, Page, Gap, Function, a Div, or another View
                                                    into this node, then drag it below to place it on {selectedNode.type === "div" ? "the container" : "the page"}
                                                    {" "}— a 12-column grid. Drag a block's right edge to resize it. A connected Function starts out as an
                                                    empty slot and fills in with whatever it produced once something calls it.{" "}
                                                    <span className="font-medium text-neutral-600">Scrolls</span> is a normal page that scrolls with its
                                                    content; <span className="font-medium text-neutral-600">Full screen</span> fills the browser window,
                                                    like an app screen.
                                                </p>
                                                {selectedNode.type === "div" && (
                                                    <p className="mt-1 text-xs text-neutral-400">
                                                        This Div lays its children out as a plain flex box (controlled by a chained Class node's
                                                        Direction/Align/Justify/Gap) until you drag or resize a block below — the moment you do, this
                                                        Div switches to the 12-column grid instead, same as a View.
                                                    </p>
                                                )}
                                            </div>

                                            {children.length === 0 ? (
                                                <p className="text-xs text-neutral-400">
                                                    Nothing connected yet. Drag from a block node's output dot onto this node to add it here.
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

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => duplicateNode(selectedNode.id)}>
                                    Duplicate node
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => deleteNode(selectedNode.id)}>
                                    Delete node
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}