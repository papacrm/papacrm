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
}

function defaultText(fields: TableField[], row: TableRow): string {
    return fields
        .map((f) => String(row.data?.[f.key] ?? ""))
        .filter(Boolean)
        .join(" — ");
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

// Shared by listViewStep.run() (standalone-page use) and View's
// "listView" block (lib/steps/view.ts) — same split as Table's
// resolveRows in ./table.
export async function resolveListItems(node: IWorkflowNode, nodes: IWorkflowNode[], edges: IWorkflowEdge[], ctx: StepContext): Promise<{ fields: TableField[]; items: ListViewItem[] }> {
    const { fields, documents } = resolveRows(ctx);
    const cardNode = findChainedCard(node, nodes, edges);
    const viewNode = findChainedView(node, nodes, edges);

    if (!cardNode && !viewNode) {
        return { fields, items: documents.map((row) => ({ _id: row._id, text: defaultText(fields, row) })) };
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
