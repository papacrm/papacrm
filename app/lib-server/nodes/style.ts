import type { IModuleEdge, IModuleNode } from "../models/Module";
import { nextEdgeTargets, renderTemplate, type NodeContext, type NodeExecutor } from "./types";

// Looks for a Style wired into `node` — an edge whose target is `node`
// and whose source is a "style" node. Same shape as findChainedClass in
// ./class.ts: the modifier is the *source*, the element it styles is the
// *target*.
export function findChainedStyle(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[]): IModuleNode | null {
    const styleEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "style");
    if (!styleEdge) return null;
    return nodes.find((n) => n.id === styleEdge.source) ?? null;
}

// Convenience wrapper around findChainedStyle — used by ./view.ts for
// Label, Div, and Image blocks so none of them has to know how a Style
// node's data is shaped. Templated the same {{field}} way as Load CSS
// (./css.ts), so a color or size computed by an earlier node can be
// baked directly into the inline style.
export function resolveStyleAttr(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[], ctx: NodeContext): string {
    const chained = findChainedStyle(node, nodes, edges);
    if (!chained) return "";
    return renderTemplate(String(chained.data?.style ?? ""), ctx).trim();
}

// A Style node never renders anything itself — it's a passthrough, same
// shape as class.ts/gap.ts. Its data is only ever read directly, via
// resolveStyleAttr above, by whatever it's chained into.
const styleNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default styleNode;
