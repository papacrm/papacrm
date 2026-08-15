import type { IModuleEdge, IModuleNode } from "../models/Module";
import { buildClassName, type ClassNodeData } from "../../lib/tailwindClasses";
import { nextEdgeTargets, type NodeExecutor } from "./types";

// Looks for a Class wired into `node` — an edge whose target is `node`
// and whose source is a "class" node. Same shape as findChainedLabel in
// ./view.ts (a Label wired into a Link): the modifier is the *source*,
// the element it styles is the *target*, same gesture as wiring any
// other block into its consumer.
export function findChainedClass(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[]): IModuleNode | null {
    const classEdge = edges.find((e) => e.target === node.id && nodes.find((n) => n.id === e.source)?.type === "class");
    if (!classEdge) return null;
    return nodes.find((n) => n.id === classEdge.source) ?? null;
}

// Convenience wrapper around findChainedClass + buildClassName — used by
// ./view.ts for both Label and Div blocks so neither has to know the
// Tailwind lookup tables themselves.
export function resolveClassName(node: IModuleNode, nodes: IModuleNode[], edges: IModuleEdge[]): string {
    const classNode = findChainedClass(node, nodes, edges);
    if (!classNode) return "";
    return buildClassName(classNode.data as ClassNodeData);
}

// A Class node never renders anything itself — it's a passthrough, same
// shape as gap.ts/div.ts. Its data is only ever read directly, via
// resolveClassName above, by whatever it's chained into.
const classNode: NodeExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default classNode;
