import type { IWorkflowEdge, IWorkflowNode } from "../models/Workflow";
import { resolveCardItems } from "./card";
import { findChainedView, resolveViewItems, type ViewBlock } from "./view";
import { resolveRows, type TableField, type TableRow } from "./table";
import type { StepContext, StepExecutor } from "./types";

export interface ListViewItem {
    _id: string;
    // Plain fallback line for this row — every field's value, joined —
    // used when no Card is chained into this List View. Same fields
    // Table would show, just laid out as a <li> instead of a row.
    text: string;
    // Set only when a Card is chained into this List View (see
    // findChainedCard below) — a component uses this in place of `text`
    // for that row.
    card?: { title: string; subtitle: string; body: string };
    // Set only when a View is chained into this List View (see
    // findChainedView below) — renders the View's blocks for each row
    // with templates resolved against that row's data.
    view?: ViewBlock[];
    // Set only when a Link is chained into this List View — makes each
    // row a clickable link with the href templated for that row.
    href?: string;
    // When a Link is chained and a Label is chained to that Link, this
    // contains the Label's text templated for this row.
    linkText?: string;
}

function defaultText(fields: TableField[], row: TableRow): string {
    return fields
        .map((f) => String(row.data?.[f.key] ?? ""))
        .filter(Boolean)
        .join(" — ");
}

// Same row templating as renderRowTemplate in card.ts, but for Link
function renderLinkTemplate(template: string, row: TableRow): string {
    if (!template) return "";
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path) => {
        const value = (row.data as any)?.[path];
        return value === undefined || value === null ? "" : String(value);
    });
}

// Looks for a Card wired into this List View — an edge whose target is
// this node and whose source is a "card" step, the very same edge that
// makes a Card chain into a View instead of rendering its own page (see
// CHAINS_INTO in lib/steps/card.ts). When found, that Card's
// title/subtitle/body templates become this List View's item template
// instead of the plain field dump in defaultText above.
function findChainedCard(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[]): IWorkflowNode | null {
    const cardEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "card");
    if (!cardEdge) return null;
    return nodes.find((n) => n.id === cardEdge.source) ?? null;
}

// Looks for a Link wired into this List View — makes each row a clickable
// link with the href templated for that row.
function findChainedLink(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[]): IWorkflowNode | null {
    const linkEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "link");
    if (!linkEdge) return null;
    return nodes.find((n) => n.id === linkEdge.source) ?? null;
}

// Looks for a Label wired into a Link — when a Label chains to a Link,
// the Label's text becomes the Link's display text.
function findChainedLabel(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[]): IWorkflowNode | null {
    const labelEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "label");
    if (!labelEdge) return null;
    return nodes.find((n) => n.id === labelEdge.source) ?? null;
}

// Shared by listViewStep.run() (standalone-page use) and View's
// "listView" block (lib/steps/view.ts) — same split as Table's
// resolveRows in ./table.
export async function resolveListItems(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[], ctx: StepContext): Promise<{ fields: TableField[]; items: ListViewItem[] }> {
    const { fields, documents } = resolveRows(ctx);
    const cardNode = findChainedCard(node, nodes, edges);
    const viewNode = findChainedView(node, nodes, edges);
    const linkNode = findChainedLink(node, nodes, edges);

    if (!cardNode && !viewNode && !linkNode) {
        return { fields, items: documents.map((row) => ({ _id: row._id, text: defaultText(fields, row) })) };
    }

    if (linkNode && !cardNode && !viewNode) {
        // The chained Link makes each row a clickable link with the href
        // templated against that row's data.
        const href = String(linkNode.data?.href ?? "");
        const labelNode = findChainedLabel(linkNode, nodes, edges);
        const labelTemplate = labelNode ? String(labelNode.data?.field ?? "") : "";

        const items: ListViewItem[] = documents.map((row) => ({
            _id: row._id,
            text: defaultText(fields, row),
            href: renderLinkTemplate(href, row),
            linkText: labelTemplate ? renderLinkTemplate(labelTemplate, row) : undefined,
        }));
        return { fields, items };
    }

    if (viewNode && !cardNode) {
        // The chained View renders its blocks once per row, with templates
        // resolved against each row's data.
        const viewItems = await resolveViewItems(viewNode, nodes, edges, ctx, documents);
        const items: ListViewItem[] = documents.map((row, i) => ({
            _id: row._id,
            text: defaultText(fields, row),
            view: viewItems[i],
        }));
        return { fields, items };
    }

    // The chained Card resolves the *same* upstream rows again (it reads
    // from this same ctx) — its own `fields`/count line up with `documents`
    // one-for-one, so they can be zipped together by index.
    const { items: cardItems } = resolveCardItems(cardNode, ctx);
    const items: ListViewItem[] = documents.map((row, i) => ({
        _id: row._id,
        text: defaultText(fields, row),
        card: cardItems[i] ? { title: cardItems[i].title, subtitle: cardItems[i].subtitle, body: cardItems[i].body } : undefined,
    }));

    return { fields, items };
}

const listViewStep: StepExecutor = {
    async run({ node, ctx, edges, nodes }) {
        const title = String(node.data?.title ?? "Records");
        const { fields, items } = await resolveListItems(node, nodes, edges, ctx);

        return {
            done: true,
            result: {
                kind: "page",
                status: 200,
                page: { title, component: "listView", props: { title, fields, items } },
            },
        };
    },
};

export default listViewStep;
