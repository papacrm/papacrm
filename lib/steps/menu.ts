import { nextEdgeTargets, type StepExecutor } from "./types";

// Menu (and Tabs, Navbar, Footer alongside it) is a page-building block,
// not something that renders on its own: its `data` (parsed by
// lib/steps/view.ts) only ever gets used when a View step reads it
// directly off the shared `nodes` list, via the edge connecting this
// node's output to that View — see resolveChildren in view.ts. That's
// also why it's never a `matchesTrigger` step and never produces a
// `done: true` result itself.
//
// This run() only matters if something *else* ever routes real execution
// through a Menu node (e.g. it's wired mid-chain rather than only into a
// View) — in that case it's a harmless passthrough, same as Function.
const menuStep: StepExecutor = {
    run({ node, edges }) {
        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default menuStep;
