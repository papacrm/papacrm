import { nextEdgeTargets, renderTemplate, type StepContext, type StepExecutor } from "./types";

// Guards a JSON blob embedded inside an injected <script> from being cut
// short by a literal "</script>" landing inside it (e.g. a stored value
// that happens to contain that text).
function escapeForScript(json: string): string {
    return json.replace(/<\/(script)/gi, "<\\/$1");
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

// State resolves every mapped value from the current context (the same
// {{field}} templating Mapper/Set Header use, see renderTemplate), adds
// those resolved values to ctx.body (making them available to subsequent
// workflow steps), and queues a script that writes the result into a
// NukeJS store (https://nukejs.com/docs/state-management) once the page
// loads in the browser.
//
// When State chains directly to a View (State → View), it also prepares a
// JSON debug display (ctx.stateDebugJson) that the View auto-injects as a
// formatted block at the top of the page.
//
// The actual browser store write can only happen client-side (there's no
// window.__nukeStores / localStorage on the server), so this step prepares
// the script; PageExtras.tsx (via ctx.clientScripts) is what gets it onto
// the eventual response.
//
// `persisted` picks which of NukeJS's two store constructors the client-side
// script mirrors:
//   - persisted → createPersistedStore: synced to localStorage under the
//     same `nuke-store:{name}` key NukeJS itself uses, so a real
//     `createPersistedStore(name, ...)` + `useStore()` elsewhere in the
//     app (e.g. a hydrated dashboard page) sees whatever this step wrote.
//   - not persisted → createStore: written straight into
//     `window.__nukeStores`, matching that module's own registry shape
//     ({ state, listeners }) and notifying any subscribed `useStore()`
//     immediately, but gone on the next hard refresh.
function buildStoreScript(store: string, mapping: Record<string, string>, ctx: StepContext, persisted: boolean): string {
    const patch: Record<string, string> = {};
    for (const [storeKey, template] of Object.entries(mapping)) {
        patch[storeKey] = renderTemplate(template, ctx);
    }
    const name = JSON.stringify(store);
    const patchJson = escapeForScript(JSON.stringify(patch));

    if (persisted) {
        const storageKey = JSON.stringify(`nuke-store:${store}`);
        return `
(function () {
  try {
    var key = ${storageKey};
    var patch = ${patchJson};
    var current = {};
    try { current = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) {}
    localStorage.setItem(key, JSON.stringify(Object.assign({}, current, patch)));
  } catch (e) {}
})();`;
    }

    return `
(function () {
  try {
    var name = ${name};
    var patch = ${patchJson};
    if (!window.__nukeStores) window.__nukeStores = new Map();
    var entry = window.__nukeStores.get(name);
    if (!entry) {
      entry = { state: {}, listeners: new Set() };
      window.__nukeStores.set(name, entry);
    }
    entry.state = Object.assign({}, entry.state, patch);
    Array.from(entry.listeners).forEach(function (l) { l(); });
  } catch (e) {}
})();`;
}

const stateStep: StepExecutor = {
    run({ node, ctx, edges, nodes }) {
        const store = String(node.data?.store ?? "").trim();
        const mapping = parseMapping(node.data?.mapping);
        const persisted = String(node.data?.persisted ?? "true") !== "false";

        if (store && Object.keys(mapping).length) {
            // Resolve templates and merge into ctx.body so subsequent steps
            // can access these values during server-side execution
            const patch: Record<string, string> = {};
            for (const [storeKey, template] of Object.entries(mapping)) {
                patch[storeKey] = renderTemplate(template, ctx);
            }
            ctx.body = { ...ctx.body, ...patch };

            // Also queue the client-side script for browser store sync
            const script = buildStoreScript(store, mapping, ctx, persisted);
            ctx.clientScripts = [...ctx.clientScripts, script];

            // If this State step chains directly to a View, prepare JSON debug output
            const nextNodeIds = nextEdgeTargets(node, edges);
            const chainsToView = nextNodeIds.some((id) => nodes.find((n) => n.id === id)?.type === "view");
            if (chainsToView) {
                ctx.stateDebugJson = JSON.stringify(patch, null, 2);
            }
        }

        return { done: false, nextNodeIds: nextEdgeTargets(node, edges) };
    },
};

export default stateStep;
