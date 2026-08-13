import type { IWorkflowNode } from "../models/Workflow";
import { resolveRows, type TableField, type TableRow } from "./table";
import { nextEdgeTargets, readPath, type StepContext, type StepExecutor } from "./types";

export interface CardItem {
    _id: string;
    title: string;
    subtitle: string;
    body: string;
    // Raw row data, kept alongside the rendered title/subtitle/body so a
    // component can fall back to it when none of the templates below are
    // set — same spirit as Table always having `fields`/`data` to fall
    // back on even with no configuration at all.
    data: Record<string, any>;
}

// Same `{{field}}` syntax as renderTemplate (./types), but resolved
// against one row's own `data` instead of the run's shared ctx.body — a
// Card renders once per row (see resolveCardItems below), so each
// placeholder needs to read from *that* row, not the whole run.
function renderRowTemplate(template: string, row: TableRow): string {
    if (!template) return "";
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, path) => {
        const value = readPath(row.data, path);
        return value === undefined || value === null ? "" : String(value);
    });
}

// Shared by cardStep.run() (standalone-page use) and both places that read
// a Card's own node data directly instead of calling its run() — View's
// "card" block (lib/steps/view.ts) and a List View that has a Card
// chained into it (lib/steps/listView.ts) — same split as Table's
// resolveRows/loadListTableData in ./table and ./listData.
export function resolveCardItems(node: IWorkflowNode, ctx: StepContext): { fields: TableField[]; items: CardItem[] } {
    const { fields, documents } = resolveRows(ctx);
    const titleTpl = String(node.data?.cardTitle ?? "");
    const subtitleTpl = String(node.data?.cardSubtitle ?? "");
    const bodyTpl = String(node.data?.cardBody ?? "");

    const items: CardItem[] = documents.map((row) => ({
        _id: row._id,
        title: renderRowTemplate(titleTpl, row),
        subtitle: renderRowTemplate(subtitleTpl, row),
        body: renderRowTemplate(bodyTpl, row),
        data: row.data ?? {},
    }));

    return { fields, items };
}

// A Card's output can be wired into a View (embeds as a grid-of-cards
// block, resolved directly by resolveChildren in lib/steps/view.ts) or a
// List View (hands over its templates as that step's per-item layout,
// resolved directly by resolveListItems in lib/steps/listView.ts) —
// either way, whatever it's chained into reads this node's data itself,
// so Card's own run() has nothing left to do but follow the chain. Only
// when nothing (or something else entirely) is downstream does Card
// render its own page — same "terminal unless chained into a View" idea
// as viewStep.run() in lib/steps/view.ts.
const CHAINS_INTO = new Set(["view", "listView"]);

const cardStep: StepExecutor = {
    run({ node, ctx, edges, nodes }) {
        const nextNodeIds = nextEdgeTargets(node, edges);
        if (nextNodeIds.length > 0 && nextNodeIds.every((id) => CHAINS_INTO.has(nodes.find((n) => n.id === id)?.type ?? ""))) {
            return { done: false, nextNodeIds };
        }

        const title = String(node.data?.title ?? "Records");
        const { fields, items } = resolveCardItems(node, ctx);

        return {
            done: true,
            result: {
                kind: "page",
                status: 200,
                page: { title, component: "card", props: { title, fields, items } },
            },
        };
    },
};

export default cardStep;
