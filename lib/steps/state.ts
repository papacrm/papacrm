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

// State is a client-side-only store: there is no server-side session, so
// "storing" something only ever really means writing it into the
// visitor's browser (localStorage, or the in-memory NukeJS store registry
// — https://nukejs.com/docs/state-management). This step never mutates
// ctx.body — doing so would make State quietly behave like a second Mapper
// for the *current* server-rendered response, which isn't what it's for.
//
// Crucially, that cuts both ways: the server can't *read* localStorage
// either. So a chained View/Input showing "the value in the store" can't
// be resolved server-side from what a previous visit persisted — only
// from whatever this specific request's mapping happens to compute (a
// webhook payload, an upstream Input's forwarded value, ...). If nothing
// upstream in *this* request supplied a field, that's all a
// server-rendered guess would ever show, even though the real persisted
// store might already hold a value for it from an earlier visit.
//
// So displaying the store is genuinely a client-side job, not a
// server-rendering one: alongside the write, this step also queues a
// hydration pass that runs once the page is in the DOM, reads back
// whatever's *actually* in the store (existing + freshly patched), and
// pushes that onto:
//   - any element on the page whose id matches a mapped store key — this
//     is what makes state -> textInput/checkboxInput/textareaInput/
//     numberInput work: those steps render their field with
//     id={name}, so id === store key === live prefill.
//   - the JSON debug block a directly-chained View renders (tagged with
//     data-state-debug="<this node's id>" — see lib/steps/view.ts) — this
//     is what makes state -> view work.
//
// ctx.stateValues still carries this request's server-resolved patch, for
// two purposes only: (1) a reasonable no-JS/first-paint fallback so the
// page isn't blank before the hydration script runs, and (2) so it can be
// tagged onto the View/Input's rendered markup for the client script to
// find and correct. It is NOT presented as "the state" — the client script
// always wins once it runs, because only it actually knows what's stored.
//
// `persisted` picks which of NukeJS's two store constructors the
// client-side script mirrors:
//   - persisted → createPersistedStore: synced to localStorage under the
//     same `nuke-store:{name}` key NukeJS itself uses, so a real
//     `createPersistedStore(name, ...)` + `useStore()` elsewhere in the
//     app (e.g. a hydrated dashboard page) sees whatever this step wrote
//     — and this step, in turn, picks up whatever a real
//     createPersistedStore already wrote on an earlier visit.
//   - not persisted → createStore: written straight into
//     `window.__nukeStores`, matching that module's own registry shape
//     ({ state, listeners }) and notifying any subscribed `useStore()`
//     immediately, but gone on the next hard refresh — so there's nothing
//     for this mode to "recall" across page loads, by design.
function buildStateScript(nodeId: string, store: string, patch: Record<string, string>, persisted: boolean): string {
    const storeJson = JSON.stringify(store);
    const patchJson = escapeForScript(JSON.stringify(patch));
    const persistedJson = JSON.stringify(persisted);
    const storageKeyJson = JSON.stringify(`nuke-store:${store}`);
    const debugSelectorJson = JSON.stringify(`[data-state-debug="${nodeId}"]`);

    return `
(function () {
  try {
    var store = ${storeJson};
    var patch = ${patchJson};
    var persisted = ${persistedJson};
    var merged;

    if (persisted) {
      var key = ${storageKeyJson};
      var current = {};
      try { current = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) {}
      merged = Object.assign({}, current, patch);
      localStorage.setItem(key, JSON.stringify(merged));
    } else {
      if (!window.__nukeStores) window.__nukeStores = new Map();
      var entry = window.__nukeStores.get(store);
      if (!entry) {
        entry = { state: {}, listeners: new Set() };
        window.__nukeStores.set(store, entry);
      }
      entry.state = Object.assign({}, entry.state, patch);
      merged = entry.state;
      Array.from(entry.listeners).forEach(function (l) { l(); });
    }

    // Push the real (persisted-aware) store contents onto whatever this
    // State step is chained into — a page render can only ever guess at
    // this from the current request, so the client is the only place
    // that actually knows what's stored.
    Object.keys(merged).forEach(function (k) {
      var el = document.getElementById(k);
      if (!el) return;
      var v = merged[k];
      if (el.type === "checkbox") {
        el.checked = !(v === undefined || v === null || v === "" || v === "false" || v === "0" || v === false);
      } else if ("value" in el) {
        el.value = v === undefined || v === null ? "" : String(v);
      }
    });

    var debugEl = document.querySelector(${debugSelectorJson});
    if (debugEl) debugEl.textContent = JSON.stringify(merged, null, 2);
  } catch (e) {}
})();`;
}

function resolvePatch(mapping: Record<string, string>, ctx: StepContext): Record<string, string> {
    const patch: Record<string, string> = {};
    for (const [storeKey, template] of Object.entries(mapping)) {
        patch[storeKey] = renderTemplate(template, ctx);
    }
    return patch;
}

const stateStep: StepExecutor = {
    run({ node, ctx, edges }) {
        const store = String(node.data?.store ?? "").trim();
        const mapping = parseMapping(node.data?.mapping);
        const persisted = String(node.data?.persisted ?? "true") !== "false";
        const nextNodeIds = nextEdgeTargets(node, edges);

        if (store && Object.keys(mapping).length) {
            // Resolve {{field}} templates against whatever's in context so
            // far (webhook body/query, an upstream Input's forwarded
            // value, ...). This is only ever this request's best guess —
            // see the client-side hydration note above for why the real
            // answer (including anything persisted from an earlier visit)
            // can only be known in the browser.
            const patch = resolvePatch(mapping, ctx);

            // Queue the write-and-hydrate script — the only place this
            // data is actually "stored" and the only place the full
            // stored value is actually known.
            ctx.clientScripts = [...ctx.clientScripts, buildStateScript(node.id, store, patch, persisted)];

            // First-paint fallback + tagging info for whatever's chained
            // directly after this step (View, or one of the Input steps)
            // — see the doc on ctx.stateValues in ./types.ts. Overwrite
            // rather than merge: only the most recently run State step's
            // data is live.
            ctx.stateValues = { nodeId: node.id, data: patch };
        } else {
            // Nothing mapped — don't leave a stale hand-off from an
            // earlier State step lying around for this step's own
            // downstream to pick up by accident.
            ctx.stateValues = undefined;
        }

        return { done: false, nextNodeIds };
    },
};

export default stateStep;
