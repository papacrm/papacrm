import type { IWorkflowEdge, IWorkflowNode } from "../models/Workflow";
import { nextEdgeTargets, renderTemplate, type StepContext, type StepExecutor } from "./types";

// Guards a JSON blob embedded inside an injected <script> from being cut
// short by a literal "</script>" landing inside it (e.g. a stored value
// that happens to contain that text).
function escapeForScript(json: string): string {
    return json.replace(/<\/(script)/gi, "<\\/$1");
}

// Same store/getState/setState/localStorage mechanics as NukeJS's own
// createPersistedStore (https://nukejs.com/docs/state-management) — same
// default `nuke-store:{name}` key — but run from a hand-written <script>
// rather than the real client-side API, since webhook-rendered pages are
// never hydrated (see the long comment in WebhookInputForm.tsx) and
// createPersistedStore/useStore only work inside a "use client" component.
// Sharing the same localStorage key is what keeps the two compatible: a
// real `useStore(theSameNamedStore)` elsewhere in the app (e.g. a
// hydrated dashboard page) sees whatever this step wrote, and vice versa.
function readsAndWritesKey(store: string): string {
    return `nuke-store:${store}`;
}

// A State node has a single input handle, but which of the two things it
// does — store or retrieve — depends on which side of it, on the canvas,
// the wire feeding it comes from (see the long comment in
// app/lib/steps/state.ts): a predecessor positioned to this node's LEFT
// (x less than this node's) is the normal chain direction and means
// STORE; a predecessor positioned to its RIGHT means the wire loops back,
// which means RETRIEVE. Only the geometry of the *source* node matters —
// where the State node's own output goes is unrelated and unaffected.
function resolveDirection(node: IWorkflowNode, edges: IWorkflowEdge[], nodes: IWorkflowNode[]): "store" | "retrieve" {
    const incomingSources = edges.filter((e) => e.target === node.id).map((e) => nodes.find((n) => n.id === e.source));
    const fromRight = incomingSources.some((source) => source && source.x > node.x);
    return fromRight ? "retrieve" : "store";
}

function parseMapping(raw: unknown): Record<string, string> {
    try {
        const parsed = JSON.parse(String(raw ?? "{}"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        const out: Record<string, string> = {};
        for (const [key, value] of Object.entries(parsed)) out[key] = String(value);
        return out;
    } catch {
        return {};
    }
}

// STORE: resolve every mapped value from the *current* context — the same
// {{field}} templating Mapper/Set Header use (see renderTemplate) — and
// queue a script that merges the result into the store's localStorage
// entry once the page loads. The actual write can only happen client-side
// (localStorage doesn't exist on the server), so this step just prepares
// the script; PageExtras.tsx (via ctx.clientScripts) is what gets it onto
// the eventual response.
function buildStoreScript(store: string, mapping: Record<string, string>, ctx: StepContext): string {
    const patch: Record<string, string> = {};
    for (const [storeKey, template] of Object.entries(mapping)) {
        patch[storeKey] = renderTemplate(template, ctx);
    }
    return `
(function () {
  try {
    var key = ${JSON.stringify(readsAndWritesKey(store))};
    var patch = ${escapeForScript(JSON.stringify(patch))};
    var current = {};
    try { current = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) {}
    localStorage.setItem(key, JSON.stringify(Object.assign({}, current, patch)));
  } catch (e) {}
})();`;
}

// RETRIEVE: queue a script that reads the store back out once the page
// loads and writes each mapped value onto the page — into a matching
// <input>/<select>/<textarea> (by `name`) if there is one, otherwise into
// any element carrying a matching `data-state` attribute (its text
// content). Mapping keys are store keys; mapping values are that target
// name, not a {{field}} template — there's no server-side context to
// template against on this side, since the value only exists in the
// visitor's browser.
function buildRetrieveScript(store: string, mapping: Record<string, string>): string {
    const targets = Object.entries(mapping).map(([storeKey, target]) => ({ storeKey, target }));
    return `
(function () {
  try {
    var key = ${JSON.stringify(readsAndWritesKey(store))};
    var targets = ${escapeForScript(JSON.stringify(targets))};
    var state = {};
    try { state = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) {}
    targets.forEach(function (t) {
      if (!(t.storeKey in state)) return;
      var value = state[t.storeKey];
      var selector = "[name=" + JSON.stringify(t.target) + "], [data-state=" + JSON.stringify(t.target) + "]";
      var el = document.querySelector(selector);
      if (!el) return;
      if ("value" in el) el.value = value;
      else el.textContent = value;
    });
  } catch (e) {}
})();`;
}

const stateStep: StepExecutor = {
    run({ node, ctx, edges, nodes }) {
        const store = String(node.data?.store ?? "").trim();
        const mapping = parseMapping(node.data?.mapping);

        if (store && Object.keys(mapping).length) {
            const direction = resolveDirection(node, edges, nodes);
            const script = direction === "store" ? buildStoreScript(store, mapping, ctx) : buildRetrieveScript(store, mapping);
            ctx.clientScripts = [...ctx.clientScripts, script];
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default stateStep;
