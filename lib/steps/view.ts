import type { IWorkflowNode, IWorkflowEdge } from "../models/Workflow";
import { resolveCardItems, type CardItem } from "./card";
import { parseFields } from "./inputForm";
import { resolveListItems, type ListViewItem } from "./listView";
import { resolveRows, type TableField } from "./table";
import { nextEdgeTargets, renderTemplate, type StepContext, type StepExecutor } from "./types";

// Node types that can be wired into a View and shown as a block inside it:
// Menu, Tabs, Navbar, Footer, Table, List View, Card, Input Form, Page
// (Static Page), Gap, a Function (rendered as an empty "slot" — see the
// "function" case below), or another View — a View wired into a View is
// just another block, laid out and resized the same as any of the
// others. See resolveChildren below and the matching UI in
// app/components/workflows/WorkflowEditor.tsx (the "Layout" section of a
// selected View's inspector).
const EMBEDDABLE_TYPES = new Set(["menu", "tabs", "navbar", "footer", "view", "table", "listView", "card", "inputForm", "staticPage", "gap", "label", "link", "function"]);

// Looks for a View wired into a ListView — an edge whose target is the
// ListView and whose source is a "view" step. When found, that View's
// blocks become the ListView's per-item template.
export function findChainedView(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[]): IWorkflowNode | null {
    const viewEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "view");
    if (!viewEdge) return null;
    return nodes.find((n) => n.id === viewEdge.source) ?? null;
}

// Looks for a Label wired into a Link — an edge whose target is the Link
// and whose source is a "label" step. When found, the Label's resolved
// text becomes the Link's display text.
function findChainedLabel(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[]): IWorkflowNode | null {
    const labelEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "label");
    if (!labelEdge) return null;
    return nodes.find((n) => n.id === labelEdge.source) ?? null;
}

// Renders a View's blocks once per row in a ListView. Each row becomes
// a separate set of blocks with templates resolved against that row's data.
export async function resolveViewItems(
    viewNode: IWorkflowNode,
    nodes: IWorkflowNode[],
    edges: IWorkflowEdge[],
    ctx: StepContext,
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
    | { type: "form"; pos: ViewBlockPosition; title: string; submitLabel: string; fields: ReturnType<typeof parseFields>; stepId: string }
    | { type: "page"; pos: ViewBlockPosition; title: string; html: string }
    | { type: "gap"; pos: ViewBlockPosition; size: number }
    | { type: "label"; pos: ViewBlockPosition; text: string }
    | { type: "link"; pos: ViewBlockPosition; href: string; text?: string; blocks?: ViewBlock[] }
    | { type: "view"; pos: ViewBlockPosition; title: string; blocks: ViewBlock[] }
    // A Function wired into a View — a placeholder that's filled in one of
    // two ways, checked in that order:
    //  1. `blocks` — a whole nested layout, set when this Function was
    //     called by a Call step that was itself fed by a View (a "View →
    //     Call" edge — see lib/steps/call.ts and ctx.viewOutput in
    //     ./types.ts) — that View's own blocks render right here, in
    //     place of the slot, instead of the View rendering as its own
    //     page. This is how a shared layout (Function → View, with the
    //     Function wired in as this slot) gets reused across pages: point
    //     each page's View at a Call step that calls this Function.
    //  2. `content` — plain text, set when this same Function was called
    //     by an ordinary Call step not fed by a View (ctx.slotContent).
    // Neither set (both null/undefined) means this Function hasn't been
    // called yet this run — a genuinely empty placeholder.
    | { type: "slot"; pos: ViewBlockPosition; name: string; content: string | null; blocks?: ViewBlock[] };

function parseLayout(node: IWorkflowNode): Record<string, Partial<ViewBlockPosition>> {
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

function parseLinks(raw: unknown): { label: string; href: string }[] {
    try {
        const parsed = JSON.parse(String(raw ?? "[]"));
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((l) => l && typeof l.href === "string").map((l) => ({ label: String(l.label ?? l.href), href: String(l.href) }));
    } catch {
        return [];
    }
}

// Finds every node wired into `view` (an edge whose target is this View)
// and turns each into the block description View.tsx knows how to render.
// A block's own StepExecutor.run() is never called here — its `data` is
// read directly off the node, same idea as Container reading a List by id.
async function resolveChildren(view: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[], ctx: StepContext, depth: number): Promise<ViewBlock[]> {
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
            const { fields, documents } = resolveRows(ctx);
            blocks.push({ type: "table", pos, fields, documents });
        } else if (child.type === "listView") {
            const { fields, items } = await resolveListItems(child, nodes, edges, ctx);
            blocks.push({ type: "listView", pos, title: String(child.data?.title ?? ""), fields, items });
        } else if (child.type === "card") {
            const { fields, items } = resolveCardItems(child, ctx);
            blocks.push({ type: "card", pos, title: String(child.data?.title ?? ""), fields, items });
        } else if (child.type === "inputForm") {
            blocks.push({
                type: "form",
                pos,
                title: String(child.data?.title ?? "Form"),
                submitLabel: String(child.data?.submitLabel ?? "Submit"),
                fields: parseFields(child),
                stepId: child.id,
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
            blocks.push({ type: "label", pos, text });
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
        } else if (child.type === "function") {
            const name = String(child.data?.name ?? "") || "Function";
            const slotBlocks = Object.prototype.hasOwnProperty.call(ctx.slotBlocks, child.id) ? (ctx.slotBlocks[child.id] as ViewBlock[]) : undefined;
            const content = Object.prototype.hasOwnProperty.call(ctx.slotContent, child.id) ? ctx.slotContent[child.id] : null;
            blocks.push({ type: "slot", pos, name, content, blocks: slotBlocks });
        }
    }

    return blocks;
}

const viewStep: StepExecutor = {
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
        // (matched by its own id via the request's `__step` field, same
        // as everywhere else — see runWorkflow in ../workflowEngine.ts),
        // runs, and then follows its own outgoing edge back to this View
        // to re-render the page. So by the time this View's own run() is
        // called, there's never a submission to fold in here.
        // Templated ({{field}}), same as the fields inside it — a View
        // built from a list workflow can show e.g. {{item.name}} in its
        // title/browser tab, not just a fixed string.
        const title = renderTemplate(String(node.data?.title ?? "Page"), ctx);
        const blocks = await resolveChildren(node, nodes, edges, ctx, 0);

        if (nextNodeIds.length > 0) {
            // Chained into something other than a View — most commonly a
            // Call step that calls a shared layout's Function (see the
            // "slot" doc on ViewBlock above and lib/steps/call.ts). Stash
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

export default viewStep;
