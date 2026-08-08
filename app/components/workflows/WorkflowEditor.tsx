"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, Link } from "nukejs";
import { ORPCError } from "@orpc/client";
import { orpc, withAuthRetry } from "@/client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { NODE_DEFS, NODE_ORDER, type WorkflowNode, type WorkflowEdge, type WorkflowNodeType } from "@/app/lib/workflowTypes";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 78;
const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 900;

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

    nodesRef.current = nodes;

    useEffect(() => {
        setOrigin(window.location.origin);
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
                    setEdges((prev) => [
                        ...prev.filter((edge) => !(edge.source === fromId && edge.sourceHandle === handle)),
                        { id: newId("e"), source: fromId, sourceHandle: handle, target: target.id },
                    ]);
                    setDirty(true);
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

    function updateNodeData(nodeId: string, key: string, value: string) {
        setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n)));
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

    return (
        <div className="flex h-[calc(100vh-73px)] flex-col">
            {/* Top bar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-6 py-3">
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
                <div className="w-48 shrink-0 overflow-y-auto border-r border-neutral-200 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Add step</p>
                    <div className="flex flex-col gap-2">
                        {NODE_ORDER.map((type) => {
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
                <div className="w-72 shrink-0 overflow-y-auto border-l border-neutral-200 p-4">
                    {!selectedNode ? (
                        <p className="text-sm text-neutral-400">Select a step to edit it, or drag from the dot on its right edge to connect it to another step.</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">{NODE_DEFS[selectedNode.type].label}</p>
                                <p className="text-xs text-neutral-500">{NODE_DEFS[selectedNode.type].description}</p>
                            </div>

                            {NODE_DEFS[selectedNode.type].fields.map((field) => (
                                <div key={field.key} className="flex flex-col gap-1.5">
                                    <Label htmlFor={field.key}>{field.label}</Label>
                                    {field.kind === "select" ? (
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
                                    ) : field.kind === "textarea" ? (
                                        <textarea
                                            id={field.key}
                                            value={selectedNode.data?.[field.key] ?? ""}
                                            onChange={(e) => updateNodeData(selectedNode.id, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={4}
                                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground"
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
                            ))}

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
