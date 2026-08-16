import type { IModuleNode, IModuleEdge } from "../models/Module";
import { resolveCardItems, type CardItem } from "./card";
import { parseFields } from "./inputForm";
import { resolveListItems, type ListViewItem } from "./listView";
import { resolveRows, type TableField } from "./table";
import { nextEdgeTargets, readPath, renderTemplate, type NodeContext, type NodeExecutor } from "./types";
import listNode from "./list";
import findNode from "./find";
import matchNode from "./match";
import projectNode from "./project";
import sortNode from "./sort";
import limitNode from "./limit";
import skipNode from "./skip";
import countNode from "./count";
import mapperNode from "./mapper";
import queryNode from "./query";
import findOneNode from "./findOne";
import { findChainedClass, resolveClassName } from "./class";
import { resolveStyleAttr } from "./style";
import { GAP_CLASS } from "../../lib/tailwindClasses";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Node types that can be wired into a View and shown as a block inside it:
// Menu, Tabs, Navbar, Footer, Table, List View, Card, Input Form, Page
// (Static Page), Gap, a Function (rendered as an empty "slot" — see the
// "function" case below), or another View — a View wired into a View is
// just another block, laid out and resized the same as any of the
// others. See resolveChildren below and the matching UI in
// app/components/modules/ModuleEditor.tsx (the "Layout" section of a
// selected View's inspector).
const EMBEDDABLE_TYPES = new Set(["menu", "tabs", "navbar", "footer", "view", "div", "table", "listView", "card", "inputForm", "staticPage", "gap", "label", "link", "image", "textInput", "checkboxInput", "textareaInput", "numberInput", "selectInput", "function"]);

// Looks for a View wired into a ListView — an edge whose target is the
// ListView and whose source is a "view" node. When found, that View's
// blocks become the ListView's per-item template.
export function findChainedView(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[]): IModuleNode | null {
    const viewEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "view");
    if (!viewEdge) return null;
    return nodes.find((n) => n.id === viewEdge.source) ?? null;
}

// Looks for a Label wired into a Link — an edge whose target is the Link
// and whose source is a "label" node. When found, the Label's resolved
// text becomes the Link's display text.
function findChainedLabel(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[]): IModuleNode | null {
    const labelEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "label");
    if (!labelEdge) return null;
    return nodes.find((n) => n.id === labelEdge.source) ?? null;
}

// Renders a View's blocks once per row in a ListView. Each row becomes
// a separate set of blocks with templates resolved against that row's data.
export async function resolveViewItems(
    viewNode: IModuleNode,
    nodes: IModuleNode[],
    edges: IModuleEdge[],
    ctx: NodeContext,
    rows: Array<{ _id: string; data: Record<string, any> }>,
): Promise<ViewBlock[][]> {
    const items: ViewBlock[][] = [];

    for (const row of rows) {
        // Create a temporary context with this row's data for template resolution
        const rowCtx = { ...ctx, body: row.data };
        const blocks = await resolveChildren(viewNode, nodes, edges, rowCtx, 0);
        items.push(blocks);
    }

    return items;
}

// A View that itself contains another View can't recurse forever — a
// person could otherwise wire View A into View B and View B back into
// View A. Same spirit as MAX_CALL_DEPTH in types.ts.
const MAX_VIEW_DEPTH = 6;

export interface ViewBlockPosition {
    // 12-column grid, 0-indexed start column.
    col: number;
    // How many of the 12 columns this block spans.
    span: number;
    // Blocks with the same row stack left-to-right (via col/span); a
    // higher row number stacks below a lower one. Purely a sort key, not
    // a literal CSS grid row — see View.tsx.
    row: number;
    // "auto" is a normal page block — it takes its natural content height
    // and the page scrolls past it like any webpage. "full" makes the
    // block fill the browser viewport (100vh), the way a full-screen app
    // screen or hero section would — see View.tsx.
    height: "auto" | "full";
}

export type ViewBlock =
    | { type: "menu"; pos: ViewBlockPosition; links: { label: string; href: string }[]; orientation: "horizontal" | "vertical" }
    | { type: "navbar"; pos: ViewBlockPosition; brand: string; links: { label: string; href: string }[] }
    | { type: "footer"; pos: ViewBlockPosition; text: string; links: { label: string; href: string }[] }
    | { type: "tabs"; pos: ViewBlockPosition; tabs: { label: string; html: string }[] }
    | { type: "table"; pos: ViewBlockPosition; fields: { key: string; label: string }[]; documents: { _id: string; data: Record<string, any> }[] }
    | { type: "listView"; pos: ViewBlockPosition; title: string; fields: TableField[]; items: ListViewItem[] }
    | { type: "card"; pos: ViewBlockPosition; title: string; fields: TableField[]; items: CardItem[] }
    | { type: "form"; pos: ViewBlockPosition; title: string; submitLabel: string; fields: ReturnType<typeof parseFields>; nodeId: string }
    | { type: "page"; pos: ViewBlockPosition; title: string; html: string }
    | { type: "gap"; pos: ViewBlockPosition; size: number }
    | { type: "label"; pos: ViewBlockPosition; text: string; className?: string; style?: string }
    | { type: "div"; pos: ViewBlockPosition; className?: string; style?: string; layoutMode: "grid" | "flow"; blocks: ViewBlock[] }
    | { type: "link"; pos: ViewBlockPosition; href: string; text?: string; blocks?: ViewBlock[] }
    | { type: "image"; pos: ViewBlockPosition; src: string; alt: string; className?: string; style?: string }
    | { type: "textInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "checkboxInput"; pos: ViewBlockPosition; name: string; label: string; checked: boolean }
    | { type: "textareaInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "numberInput"; pos: ViewBlockPosition; name: string; label: string; placeholder: string; value: string }
    | { type: "selectInput"; pos: ViewBlockPosition; name: string; label: string; options: { value: string; label: string }[]; value: string }
    | { type: "view"; pos: ViewBlockPosition; title: string; blocks: ViewBlock[] }
    // A Function wired into a View — a placeholder that's filled in one of
    // two ways, checked in that order:
    //  1. `blocks` — a whole nested layout, set when this Function was
    //     called by a Call node that was itself fed by a View (a "View →
    //     Call" edge — see lib/nodes/call.ts and ctx.viewOutput in
    //     ./types.ts) — that View's own blocks render right here, in
    //     place of the slot, instead of the View rendering as its own
    //     page. This is how a shared layout (Function → View, with the
    //     Function wired in as this slot) gets reused across pages: point
    //     each page's View at a Call node that calls this Function.
    //  2. `content` — plain text, set when this same Function was called
    //     by an ordinary Call node not fed by a View (ctx.slotContent).
    // Neither set (both null/undefined) means this Function hasn't been
    // called yet this run — a genuinely empty placeholder.
    | { type: "slot"; pos: ViewBlockPosition; name: string; content: string | null; blocks?: ViewBlock[] };

function parseLayout(node: IModuleNode): Record<string, Partial<ViewBlockPosition>> {
    try {
        const parsed = JSON.parse(node.data?.layout ?? "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        // Malformed JSON in the layout field — every block falls back to
        // the default position below rather than failing the whole page.
        return {};
    }
}

function resolvePosition(layout: Record<string, Partial<ViewBlockPosition>>, nodeId: string): ViewBlockPosition {
    const entry = layout[nodeId] ?? {};
    const col = Number.isFinite(Number(entry.col)) ? Math.max(0, Math.min(11, Number(entry.col))) : 0;
    const span = Number.isFinite(Number(entry.span)) ? Math.max(1, Math.min(12, Number(entry.span))) : 12;
    const row = Number.isFinite(Number(entry.row)) ? Number(entry.row) : 0;
    const height = entry.height === "full" ? "full" : "auto";
    return { col, span, row, height };
}

// True when a layout entry represents a deliberate resize/reposition
// rather than the trivial one the editor auto-assigns the moment a block
// is wired in (see the "isNewEdge && target.type === view/div" branch in
// ModuleEditor.tsx: {col: 0, span: 12, row: maxRow + 1, height: "auto"}).
// Row is deliberately excluded — it only ever records *stacking order*
// (bumped automatically on every new connection), never a deliberate
// size/position choice, so two untouched blocks always differ in row
// without that meaning either was "positioned" by hand. col/span/height
// are the only fields the Layout designer's drag-to-move/drag-to-resize
// actually changes away from their defaults — see hasCustomLayout below.
function hasCustomPosition(entry: Partial<ViewBlockPosition> | undefined): boolean {
    if (!entry) return false;
    const col = Number(entry.col);
    const span = Number(entry.span);
    if (Number.isFinite(col) && col !== 0) return true;
    if (Number.isFinite(span) && span !== 12) return true;
    if (entry.height === "full") return true;
    return false;
}

// A Div defaults to laying its children out as a plain flex container
// (see the "div" branch in resolveChildren and BlockGrid.tsx) so its own
// Class-node flex settings (direction/itemsAlign/justify/gap — see
// tailwindClasses.ts) apply directly to its children. It only switches
// to the 12-column grid-with-explicit-positions system — the same one a
// View uses — once the person has actually dragged/resized a block
// inside it in the Layout designer; until then, forcing `grid
// grid-cols-12 gap-6` onto every Div regardless of whether anyone asked
// for grid placement fights whatever flex layout the Class node set up.
function hasCustomLayout(node: IModuleNode): boolean {
    const layout = parseLayout(node);
    return Object.values(layout).some(hasCustomPosition);
}

function parseLinks(raw: unknown): { label: string; href: string }[] {
    try {
        const parsed = JSON.parse(String(raw ?? "[]"));
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((l) => l && typeof l.href === "string").map((l) => ({ label: String(l.label ?? l.href), href: String(l.href) }));
    } catch {
        return [];
    }
}

// Resolves what an embedded Input block should show for `name`: a State
// node's resolved values (ctx.stateValues, set only when a State node is
// directly chained right before whatever's being rendered here — see
// lib/nodes/state.ts) win when present, since that's the explicit
// "state -> input" hand-off; otherwise fall back to plain ctx.body, which
// covers a value that arrived some other way (a webhook payload, an
// upstream Input node forwarding what it was submitted, a re-rendered
// form, ...). Either way this is only ever a first-paint guess — State's
// own client-side script corrects it once the page loads with whatever's
// actually persisted (see lib/nodes/state.ts).
function resolveInputValue(name: string, ctx: NodeContext): unknown {
    if (!name) return undefined;
    const stateData = ctx.stateValues?.data;
    if (stateData && Object.prototype.hasOwnProperty.call(stateData, name)) return stateData[name];
    return readPath(ctx.body, name);
}

// Nodes whose whole job is reshaping the "current data" flowing through
// the run (see resolveIsolatedBody below) — safe to re-run in isolation
// because none of them have side effects other than reassigning
// ctx.body/ctx.body.documents.
const REPLAYABLE_NODES: Partial<Record<string, NodeExecutor>> = {
    list: listNode,
    find: findNode,
    match: matchNode,
    project: projectNode,
    sort: sortNode,
    limit: limitNode,
    skip: skipNode,
    count: countNode,
    mapper: mapperNode,
    query: queryNode,
    findOne: findOneNode,
};

// A View that embeds more than one Table/List View/Card — e.g. one fed by
// List → Find → Match and a sibling fed by its own List → Find, both wired
// into the same View — can't just read `ctx.body` for each of them: by the
// time this View renders, `ctx.body` is whatever the *last* node to touch
// it left behind, with no memory of which embedded block it was actually
// meant for. (Two branches converging on the same View node are executed
// once per incoming branch — see runModule's fan-out in
// ../moduleEngine.ts — and each of those executions calls this same
// resolveChildren, which statically resolves *every* embedded block from
// whatever ctx that particular execution happens to be carrying. So even
// with each branch's own `ctx.body` correctly isolated from its sibling,
// a sibling block embedded in the same View still ends up borrowing
// whichever branch's data happened to render the page.)
//
// The fix: instead of reading the ambient ctx.body, walk backward from the
// embedded node through its own single-predecessor chain of pure
// data-shaping nodes (List/Find/Match/Project/Sort/Limit/Skip/Count/
// Mapper/Query/FindOne) and replay just that chain in isolation. Falls
// back to the ambient ctx.body — exactly the old behavior — the moment the
// walk can't find such a chain (a branch/join, a non-replayable node, or
// simply nothing upstream): that's the common case of a single linear
// pipeline feeding one embedded block, where "whatever the previous node
// left in context" was already correct.
async function resolveIsolatedBody(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[], ctx: NodeContext): Promise<unknown> {
    const chain: IModuleNode[] = [];
    const seen = new Set<string>();
    let currentId: string | undefined = node.id;

    while (currentId) {
        const incoming = edges.filter((e) => e.target === currentId);
        if (incoming.length !== 1) break; // no predecessor, or a real join — ambient ctx.body is the best we can do
        const prevId = incoming[0].source;
        if (seen.has(prevId)) break; // guard against a cycle in a hand-built graph
        seen.add(prevId);
        const prevNode = nodes.find((n) => n.id === prevId);
        if (!prevNode || !REPLAYABLE_NODES[prevNode.type]) break;
        chain.unshift(prevNode);
        if (prevNode.type === "list") break; // reached this block's own data source — nothing further back to replay
        currentId = prevId;
    }

    // Only replay when the chain traces all the way back to its own List —
    // otherwise we can't tell this apart from the ordinary case (a Table
    // showing a submitted Input Form, a webhook's JSON body, etc.), where
    // ambient ctx.body is exactly right and re-deriving it would be wrong.
    if (chain.length === 0 || chain[0].type !== "list") return ctx.body;

    const replayCtx: NodeContext = { ...ctx, body: undefined };
    for (const node of chain) {
        const executor = REPLAYABLE_NODES[node.type]!;
        await executor.run({ node: node, ctx: replayCtx, trigger: { method: "GET", path: "", query: ctx.query, body: undefined, headers: {}, cookies: {} }, edges, nodes, isEntry: false });
    }
    return replayCtx.body;
}

// Finds every node wired into `view` (an edge whose target is this View)
// and turns each into the block description View.tsx knows how to render.
// A block's own NodeExecutor.run() is never called here — its `data` is
// read directly off the node, same idea as Container reading a List by id.
async function resolveChildren(view: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[], ctx: NodeContext, depth: number): Promise<ViewBlock[]> {
    if (depth > MAX_VIEW_DEPTH) return [];

    const layout = parseLayout(view);
    const childIds = edges.filter((e) => e.target === view.id).map((e) => e.source);
    const blocks: ViewBlock[] = [];

    for (const childId of childIds) {
        const child = nodes.find((n) => n.id === childId);
        if (!child || !EMBEDDABLE_TYPES.has(child.type)) continue;
        const pos = resolvePosition(layout, child.id);

        if (child.type === "menu") {
            const orientation = child.data?.orientation === "vertical" ? "vertical" : "horizontal";
            blocks.push({ type: "menu", pos, links: parseLinks(child.data?.links), orientation });
        } else if (child.type === "navbar") {
            blocks.push({ type: "navbar", pos, brand: renderTemplate(String(child.data?.brand ?? ""), ctx), links: parseLinks(child.data?.links) });
        } else if (child.type === "footer") {
            blocks.push({ type: "footer", pos, text: renderTemplate(String(child.data?.text ?? ""), ctx), links: parseLinks(child.data?.links) });
        } else if (child.type === "tabs") {
            let tabs: { label: string; html: string }[] = [];
            try {
                const parsed = JSON.parse(child.data?.tabs ?? "[]");
                if (Array.isArray(parsed)) {
                    tabs = parsed.map((t: any) => ({ label: String(t?.label ?? "Tab"), html: renderTemplate(String(t?.html ?? ""), ctx) }));
                }
            } catch {
                // Malformed JSON — render with no tabs rather than failing
                // the whole page.
            }
            blocks.push({ type: "tabs", pos, tabs });
        } else if (child.type === "table") {
            const isolatedCtx = { ...ctx, body: await resolveIsolatedBody(child, nodes, edges, ctx) };
            const { fields, documents } = resolveRows(isolatedCtx);
            blocks.push({ type: "table", pos, fields, documents });
        } else if (child.type === "listView") {
            const isolatedCtx = { ...ctx, body: await resolveIsolatedBody(child, nodes, edges, ctx) };
            const { fields, items } = await resolveListItems(child, nodes, edges, isolatedCtx);
            blocks.push({ type: "listView", pos, title: String(child.data?.title ?? ""), fields, items });
        } else if (child.type === "card") {
            const isolatedCtx = { ...ctx, body: await resolveIsolatedBody(child, nodes, edges, ctx) };
            const { fields, items } = resolveCardItems(child, isolatedCtx);
            blocks.push({ type: "card", pos, title: String(child.data?.title ?? ""), fields, items });
        } else if (child.type === "inputForm") {
            blocks.push({
                type: "form",
                pos,
                title: String(child.data?.title ?? "Form"),
                submitLabel: String(child.data?.submitLabel ?? "Submit"),
                fields: parseFields(child),
                nodeId: child.id,
            });
        } else if (child.type === "view") {
            const nestedBlocks = await resolveChildren(child, nodes, edges, ctx, depth + 1);
            blocks.push({ type: "view", pos, title: renderTemplate(String(child.data?.title ?? ""), ctx), blocks: nestedBlocks });
        } else if (child.type === "staticPage") {
            const pageTitle = String(child.data?.title ?? "");
            const html = renderTemplate(String(child.data?.html ?? ""), ctx);
            blocks.push({ type: "page", pos, title: pageTitle, html });
        } else if (child.type === "gap") {
            const size = Number(child.data?.size);
            blocks.push({ type: "gap", pos, size: Number.isFinite(size) && size > 0 ? size : 48 });
        } else if (child.type === "label") {
            const text = renderTemplate(String(child.data?.field ?? ""), ctx);
            const className = resolveClassName(child, nodes, edges);
            const style = resolveStyleAttr(child, nodes, edges, ctx);
            blocks.push({ type: "label", pos, text, className: className || undefined, style: style || undefined });
        } else if (child.type === "div") {
            let className = resolveClassName(child, nodes, edges);
            // The Div's own `gap` field (see lib/node-defs/div.ts) is a
            // shortcut for the common "just space my children out" case
            // that doesn't need a whole Class node wired in — but a
            // chained Class node's own gap, if it set one, wins, so
            // nothing is silently double-applied or overridden by a
            // stale default sitting in the Div's own data.
            const classNode = findChainedClass(child, nodes, edges);
            const classNodeHasGap = Boolean((classNode?.data as { gap?: string } | undefined)?.gap);
            if (!classNodeHasGap) {
                const gap = String((child.data as { gap?: string } | undefined)?.gap ?? "");
                const gapClass = GAP_CLASS[gap];
                if (gapClass) className = className ? `${className} flex ${gapClass}` : `flex ${gapClass}`;
            }
            const style = resolveStyleAttr(child, nodes, edges, ctx);
            const layoutMode: "grid" | "flow" = hasCustomLayout(child) ? "grid" : "flow";
            const nestedBlocks = await resolveChildren(child, nodes, edges, ctx, depth + 1);
            blocks.push({ type: "div", pos, className: className || undefined, style: style || undefined, layoutMode, blocks: nestedBlocks });
        } else if (child.type === "link") {
            const href = renderTemplate(String(child.data?.href ?? ""), ctx);
            const labelNode = findChainedLabel(child, nodes, edges);
            const viewNode = findChainedView(child, nodes, edges);
            let text: string | undefined;
            let linkBlocks: ViewBlock[] | undefined;

            if (viewNode) {
                linkBlocks = await resolveChildren(viewNode, nodes, edges, ctx, depth + 1);
            } else if (labelNode) {
                text = renderTemplate(String(labelNode.data?.field ?? ""), ctx);
            }

            blocks.push({ type: "link", pos, href, text, blocks: linkBlocks });
        } else if (child.type === "image") {
            const src = renderTemplate(String(child.data?.src ?? ""), ctx);
            // A Class or Style node can be chained onto an Image the same
            // way as a Label or Div — see IMAGE_WIDTH_OPTIONS/
            // IMAGE_HEIGHT_OPTIONS in tailwindClasses.ts and the "image"
            // case in ModuleEditor.tsx's Class inspector.
            const className = resolveClassName(child, nodes, edges);
            const style = resolveStyleAttr(child, nodes, edges, ctx);
            blocks.push({ type: "image", pos, src, alt: String(child.data?.alt ?? ""), className: className || undefined, style: style || undefined });
        } else if (child.type === "textInput") {
            const name = String(child.data?.name ?? "");
            const value = resolveInputValue(name, ctx);
            blocks.push({ type: "textInput", pos, name, label: String(child.data?.label ?? ""), placeholder: String(child.data?.placeholder ?? ""), value: value == null ? "" : String(value) });
        } else if (child.type === "checkboxInput") {
            const name = String(child.data?.name ?? "");
            const value = resolveInputValue(name, ctx);
            // Treat the common "falsy string" cases from a stored/mapped
            // value ("false", "0", "") as unchecked, not just JS-falsy.
            const checked = typeof value === "string" ? !["", "false", "0"].includes(value.toLowerCase()) : Boolean(value);
            blocks.push({ type: "checkboxInput", pos, name, label: String(child.data?.label ?? ""), checked });
        } else if (child.type === "textareaInput") {
            const name = String(child.data?.name ?? "");
            const value = resolveInputValue(name, ctx);
            blocks.push({ type: "textareaInput", pos, name, label: String(child.data?.label ?? ""), placeholder: String(child.data?.placeholder ?? ""), value: value == null ? "" : String(value) });
        } else if (child.type === "numberInput") {
            const name = String(child.data?.name ?? "");
            const value = resolveInputValue(name, ctx);
            blocks.push({ type: "numberInput", pos, name, label: String(child.data?.label ?? ""), placeholder: String(child.data?.placeholder ?? ""), value: value == null ? "" : String(value) });
        } else if (child.type === "selectInput") {
            const name = String(child.data?.name ?? "");
            const value = resolveInputValue(name, ctx);
            let options: { value: string; label: string }[] = [];
            try {
                const parsed = JSON.parse(child.data?.options ?? "[]");
                if (Array.isArray(parsed)) {
                    options = parsed.filter((o) => o && typeof o.value === "string").map((o) => ({ value: o.value, label: String(o.label ?? o.value) }));
                }
            } catch {
                // Malformed JSON in the options field — render with no
                // options rather than failing the whole page.
            }
            blocks.push({ type: "selectInput", pos, name, label: String(child.data?.label ?? ""), options, value: value == null ? "" : String(value) });
        } else if (child.type === "function") {
            const name = String(child.data?.name ?? "") || "Function";
            const slotBlocks = Object.prototype.hasOwnProperty.call(ctx.slotBlocks, child.id) ? (ctx.slotBlocks[child.id] as ViewBlock[]) : undefined;
            const content = Object.prototype.hasOwnProperty.call(ctx.slotContent, child.id) ? ctx.slotContent[child.id] : null;
            blocks.push({ type: "slot", pos, name, content, blocks: slotBlocks });
        }
    }

    return blocks;
}

const viewNode: NodeExecutor = {
    async run({ node, ctx, edges, nodes }) {
        // A View that's chained into another View (its output wired into
        // that View's input — the very same edge that makes it show up as
        // a block in that View's Layout, see resolveChildren above) acts
        // as part of that View rather than rendering as a page of its
        // own: follow the chain instead of finishing here. Whichever View
        // is actually the *last* one in the chain is the one that
        // renders — and it pulls this View back in as a nested block via
        // resolveChildren, so nothing connected to it is lost, it's just
        // no longer its own separate page.
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length > 0 && nextNodeIds.every((id) => nodes.find((n) => n.id === id)?.type === "view")) {
            return { done: false, nextNodeIds };
        }

        // A View can also chain into a ListView as a per-item template,
        // similar to how Card chains in. Same idea: don't render the View
        // itself, just pass control to the ListView.
        if (nextNodeIds.length > 0 && nextNodeIds.every((id) => nodes.find((n) => n.id === id)?.type === "listView")) {
            return { done: false, nextNodeIds };
        }

        // A View can also chain into a Link as its content/blocks. Don't render
        // the View itself, just pass control to the Link.
        if (nextNodeIds.length > 0 && nextNodeIds.every((id) => nodes.find((n) => n.id === id)?.type === "link")) {
            return { done: false, nextNodeIds };
        }

        // A View has no path or submission handling of its own — an
        // embedded Input Form's own submission resumes at *that* node
        // (matched by its own id via the request's `__node` field, same
        // as everywhere else — see runModule in ../moduleEngine.ts),
        // runs, and then follows its own outgoing edge back to this View
        // to re-render the page. So by the time this View's own run() is
        // called, there's never a submission to fold in here.
        // Templated ({{field}}), same as the fields inside it — a View
        // built from a list module can show e.g. {{item.name}} in its
        // title/browser tab, not just a fixed string.
        const title = renderTemplate(String(node.data?.title ?? "Page"), ctx);
        const blocks = await resolveChildren(node, nodes, edges, ctx, 0);

        // If a State node chained directly to this View, auto-inject a JSON
        // debug block at the top showing the state values. This is only
        // this request's server-resolved guess — it's tagged with
        // data-state-debug so State's own client-side hydration script can
        // find it and overwrite it with the real, persisted-aware store
        // contents once the page loads (see lib/nodes/state.ts).
        if (ctx.stateValues) {
            const { nodeId, data } = ctx.stateValues;
            const debugJson = JSON.stringify(data, null, 2);
            const debugBlock: ViewBlock = {
                type: "page",
                pos: { col: 0, span: 12, row: -1, height: "auto" },
                title: "State Debug",
                html: `<div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;"><h3 style="margin: 0 0 0.5rem; font-size: 0.875rem; font-weight: 600; color: #374151;">State Values</h3><pre data-state-debug="${escapeHtml(nodeId)}" style="margin: 0; font-size: 0.875rem; color: #1f2937; overflow-x: auto;">${escapeHtml(debugJson)}</pre></div>`,
            };
            blocks.unshift(debugBlock);
            ctx.stateValues = undefined; // Clear after use
        }

        if (nextNodeIds.length > 0) {
            // Chained into something other than a View — most commonly a
            // Call node that calls a shared layout's Function (see the
            // "slot" doc on ViewBlock above and lib/nodes/call.ts). Stash
            // this View's own rendered output, keyed by its own id, then
            // keep going instead of answering with it directly — whatever
            // this chains into decides what actually becomes the response.
            ctx.viewOutput[node.id] = { title, blocks };
            return { done: false, nextNodeIds };
        }

        return {
            done: true,
            result: { kind: "page", status: 200, page: { title, component: "view", props: { title, blocks } } },
        };
    },
};

export default viewNode;
