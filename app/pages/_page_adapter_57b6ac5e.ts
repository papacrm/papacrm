import type { IncomingMessage, ServerResponse } from 'http';
import { createElement as __createElement__ } from 'react';
import { renderToString as __renderToString__ } from 'react-dom/server';
import * as __page__ from "./_500.tsx";
import __layout_0__ from "./layout.tsx";
import __cc_tag_0__ from "../../node_modules/nukejs/dist/Link.js";
if (typeof __cc_tag_0__ === 'function') (__cc_tag_0__ as any).__nukeClientId = "cc_aee986c0";

const CLIENT_COMPONENTS: Record<string, string> = {"Link":"cc_aee986c0"};
const ALL_CLIENT_IDS: string[] = ["cc_aee986c0"];
const PRERENDERED_HTML: Record<string, string> = {"cc_aee986c0":"<a></a>","cc_3fcbb43d":"<div class=\"flex min-h-[50vh] items-center justify-center\"><p class=\"text-sm text-neutral-500\">Loading…</p></div>","cc_5884f7b3":"<button class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background border border-border bg-transparent hover:bg-secondary text-foreground h-8 px-3 text-xs\" type=\"button\">Log out</button>","cc_336c7348":"<div class=\"flex min-h-[50vh] items-center justify-center\"><p class=\"text-sm text-neutral-500\">Loading…</p></div>","cc_425678cb":"<div class=\"mx-auto flex max-w-3xl flex-col gap-8\"><div><h1 class=\"text-2xl font-semibold tracking-tight text-neutral-900\">Lists</h1><p class=\"mt-1 text-sm text-neutral-500\">Define a custom schema, then add and edit documents that follow it.</p></div><div class=\"rounded-xl border border-border bg-card text-card-foreground shadow-sm\"><div class=\"flex flex-col space-y-1.5 p-6\"><h3 class=\"font-semibold tracking-tight text-base\">New list</h3><p class=\"text-sm text-muted-foreground\">Give it a name — you&#x27;ll design its fields next, in the editor.</p></div><div class=\"p-6 pt-0\"><form class=\"flex gap-2\"><input class=\"flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50\" placeholder=\"e.g. Contacts\" value=\"\"/><button class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 py-2 shrink-0\" type=\"submit\">Create</button></form></div></div><p class=\"text-sm text-neutral-500\">Loading…</p></div>","cc_11e187ba":"<div class=\"mx-auto flex max-w-3xl flex-col gap-8\"><div><h1 class=\"text-2xl font-semibold tracking-tight text-neutral-900\">Workflows</h1><p class=\"mt-1 text-sm text-neutral-500\">Build automations from a webhook trigger, an HTTP request, a condition, and a static page response.</p></div><div class=\"rounded-xl border border-border bg-card text-card-foreground shadow-sm\"><div class=\"flex flex-col space-y-1.5 p-6\"><h3 class=\"font-semibold tracking-tight text-base\">New workflow</h3><p class=\"text-sm text-muted-foreground\">Give it a name — you can rename it later from the editor.</p></div><div class=\"p-6 pt-0\"><form class=\"flex gap-2\"><input class=\"flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50\" placeholder=\"e.g. New signup notification\" value=\"\"/><button class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 py-2 shrink-0\" type=\"submit\">Create</button></form></div></div><p class=\"text-sm text-neutral-500\">Loading…</p></div>","cc_ef20a726":"<div class=\"rounded-xl border border-border bg-card text-card-foreground shadow-sm w-full max-w-sm\"><div class=\"flex flex-col space-y-1.5 p-6\"><h3 class=\"text-xl font-semibold leading-none tracking-tight\">Missing email address</h3><p class=\"text-sm text-muted-foreground\">Start over from the sign-in page.</p></div><div class=\"p-6 pt-0\"><button class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 py-2 w-full\">Back to sign in</button></div></div>","cc_2a2d3253":"<div><h1 class=\"text-2xl font-semibold tracking-tight text-neutral-900\">Dashboard</h1><p class=\"mt-2 text-neutral-500\">No access token cookie found — you may need to sign in again.</p><a href=\"/d/workflows\" class=\"mt-6 flex max-w-sm items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 text-sm hover:border-neutral-300 hover:bg-neutral-50\"><span><span class=\"block font-medium text-neutral-900\">Workflows</span><span class=\"block text-neutral-500\">Build automations with webhooks, HTTP requests, conditions, and pages</span></span><span aria-hidden=\"true\">→</span></a></div>","cc_4da5dce8":"<div class=\"rounded-xl border border-border bg-card text-card-foreground shadow-sm w-full max-w-sm\"><div class=\"flex flex-col space-y-1.5 p-6\"><h3 class=\"text-xl font-semibold leading-none tracking-tight\">Sign in</h3><p class=\"text-sm text-muted-foreground\">Enter your email address to receive a one-time code.</p></div><div class=\"p-6 pt-0\"><form class=\"flex flex-col gap-4\"><div class=\"flex flex-col gap-2\"><label class=\"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70\" for=\"email\">Email address</label><input type=\"email\" class=\"flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50\" id=\"email\" inputMode=\"email\" autoComplete=\"email\" placeholder=\"you@example.com\" autofocus=\"\" name=\"email\" value=\"\"/></div><button class=\"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5 py-2 w-full\" type=\"submit\">Send code</button></form></div></div>"};
// ROUTE_PARAM_NAMES: the dynamic segments baked into this page's URL pattern.
// Used to separate them from real user-supplied query params at runtime.
const ROUTE_PARAM_NAMES = new Set<string>([]);
const CATCH_ALL_NAMES   = new Set<string>([]);

// ─── html-store (inlined) ─────────────────────────────────────────────────────
type TitleValue = string | ((prev: string) => string);
interface HtmlStore {
  titleOps: TitleValue[];
  htmlAttrs: Record<string, string | undefined>;
  bodyAttrs: Record<string, string | undefined>;
  meta: Record<string, string | undefined>[];
  link: Record<string, string | undefined>[];
  script: Record<string, any>[];
  style: { content?: string; media?: string }[];
}
const __STORE_KEY__ = Symbol.for('__nukejs_html_store__');
const __getStore = (): HtmlStore | null => (globalThis as any)[__STORE_KEY__] ?? null;
const __setStore = (s: HtmlStore | null): void => { (globalThis as any)[__STORE_KEY__] = s; };
const __emptyStore = (): HtmlStore =>
  ({ titleOps: [], htmlAttrs: {}, bodyAttrs: {}, meta: [], link: [], script: [], style: [] });
async function runWithHtmlStore(fn: () => Promise<void>): Promise<HtmlStore> {
  __setStore(__emptyStore());
  try { await fn(); return { ...(__getStore() ?? __emptyStore()) }; }
  finally { __setStore(null); }
}
function resolveTitle(ops: TitleValue[], fallback = ''): string {
  let t = fallback;
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i]; t = typeof op === 'string' ? op : op(t);
  }
  return t;
}

// ─── request-store (inlined) ──────────────────────────────────────────────────
const SENSITIVE_HEADERS = new Set([
  'cookie','authorization','proxy-authorization','set-cookie','x-api-key',
]);
// Flattens multi-value headers to strings; keeps all headers including credentials.
function normaliseHeaders(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}
// Same as normaliseHeaders but strips credentials before embedding in HTML.
function sanitiseHeaders(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (SENSITIVE_HEADERS.has(k.toLowerCase()) || v === undefined) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}
const __REQ_KEY__ = Symbol.for('__nukejs_request_store__');
const __getReq = () => (globalThis as any)[__REQ_KEY__] ?? null;
const __setReq = (v: any) => { (globalThis as any)[__REQ_KEY__] = v; };
async function runWithRequestStore<T>(ctx: any, fn: () => Promise<T>): Promise<T> {
  __setReq(ctx);
  try { return await fn(); } finally { __setReq(null); }
}

// ─── cache-store (inlined) ─────────────────────────────────────────────────────
// See src/cache-store.ts for the full explanation. Request-scoped memoisation
// for async data loaders, keyed on the wrapped function + its (serialisable)
// arguments. Reset per request exactly like the request/html stores above.
const __CACHE_KEY__ = Symbol.for('__nukejs_cache_store__');
const __getCache = (): { entries: Map<string, Promise<unknown>> } | null =>
  (globalThis as any)[__CACHE_KEY__] ?? null;
const __setCache = (v: { entries: Map<string, Promise<unknown>> } | null): void => {
  (globalThis as any)[__CACHE_KEY__] = v;
};
async function runWithCacheStore<T>(fn: () => Promise<T>): Promise<T> {
  __setCache({ entries: new Map() });
  try { return await fn(); } finally { __setCache(null); }
}
let __cacheIdCounter = 0;
function __serialiseArgs(args: unknown[]): string | null {
  try {
    return JSON.stringify(args, (_k, v) => {
      if (typeof v === 'function' || typeof v === 'symbol') throw new Error('non-serialisable');
      return v;
    });
  } catch { return null; }
}
function cache<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>): (...args: Args) => Promise<R> {
  const id = `c${++__cacheIdCounter}`;
  return function cached(...args: Args): Promise<R> {
    const store = __getCache();
    if (!store) return fn(...args);
    const argsKey = __serialiseArgs(args);
    if (argsKey === null) return fn(...args);
    const key = `${id}:${argsKey}`;
    const existing = store.entries.get(key);
    if (existing) return existing as Promise<R>;
    const result = fn(...args);
    store.entries.set(key, result);
    result.catch(() => { store.entries.delete(key); });
    return result;
  };
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function renderAttrs(attrs: Record<string, string | boolean | undefined>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => v === true ? k : `${k}="${escapeAttr(String(v))}"`)
    .join(' ');
}
function openTag(tag: string, attrs: Record<string, string | undefined>): string {
  const s = renderAttrs(attrs as Record<string, string | boolean | undefined>);
  return s ? `<${tag} ${s}>` : `<${tag}>`;
}
function renderMetaTag(tag: Record<string, string | undefined>): string {
  const key = (k: string) => k === 'httpEquiv' ? 'http-equiv' : k;
  const attrs: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(tag)) if (v !== undefined) attrs[key(k)] = v;
  return `  <meta ${renderAttrs(attrs as any)} />`;
}
function renderLinkTag(tag: Record<string, string | undefined>): string {
  const key = (k: string) => k === 'hrefLang' ? 'hreflang' : k === 'crossOrigin' ? 'crossorigin' : k;
  const attrs: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(tag)) if (v !== undefined) attrs[key(k)] = v;
  return `  <link ${renderAttrs(attrs as any)} />`;
}
function renderScriptTag(tag: any): string {
  const s = renderAttrs({ src: tag.src, type: tag.type, crossorigin: tag.crossOrigin,
    integrity: tag.integrity, defer: tag.defer, async: tag.async, nomodule: tag.noModule });
  return `  ${s ? `<script ${s}>` : '<script>'}${tag.src ? '' : (tag.content ?? '')}</script>`;
}
function renderStyleTag(tag: any): string {
  const media = tag.media ? ` media="${escapeAttr(tag.media)}"` : '';
  return `  <style${media}>${tag.content ?? ''}</style>`;
}

// ─── HTML minifier ────────────────────────────────────────────────────────────
// Minifies the final HTML string before sending it to the client.
// Sentinel comments (<!--n-head-->, <!--/n-head-->, <!--n-body-scripts-->,
// <!--/n-body-scripts-->) are preserved — the client runtime needs them for
// head diffing during soft navigation.
function minifyHtml(h: string): string {
  const pres: string[] = [];
  const withoutPres = h.replace(/<pre[\s\S]*?<\/pre>/g, (m) => {
    pres.push(m);
    return '<!--n-pre-' + (pres.length - 1) + '-->';
  });
  const minified = withoutPres
    .replace(/<!--(?!(n-head|\/n-head|n-body-scripts|\/n-body-scripts|n-pre-))[\s\S]*?-->/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  return pres.length === 0
    ? minified
    : minified.replace(/<!--n-pre-(\d+)-->/g, (_, i) => pres[+i]);
}

// ─── Renderer ─────────────────────────────────────────────────────────────────
const VOID_TAGS = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);

// ─── Wrapper attribute helpers ────────────────────────────────────────────────
function isWrapperAttr(key: string): boolean {
  return (
    key === 'className' ||
    key === 'style'     ||
    key === 'id'        ||
    key.startsWith('data-') ||
    key.startsWith('aria-')
  );
}
function splitWrapperAttrs(props: any): { wrapperAttrs: Record<string, any>; componentProps: Record<string, any> } {
  const wrapperAttrs: Record<string, any>   = {};
  const componentProps: Record<string, any> = {};
  for (const [key, value] of Object.entries((props || {}) as Record<string, any>)) {
    if (isWrapperAttr(key)) wrapperAttrs[key]   = value;
    else                    componentProps[key] = value;
  }
  return { wrapperAttrs, componentProps };
}
function buildWrapperAttrString(attrs: Record<string, any>): string {
  const parts = Object.entries(attrs)
    .map(([key, value]) => {
      if (key === 'className') key = 'class';
      if (key === 'style' && typeof value === 'object') {
        // Always prepend display:contents so the wrapper span is invisible to layout.
        const css = 'display:contents;' + Object.entries(value as Record<string, any>)
          .map(([p, val]) => `${p.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${escapeHtml(String(val))}`)
          .join(';');
        return `style="${css}"`;
      }
      if (typeof value === 'boolean') return value ? key : '';
      if (value == null) return '';
      return `${key}="${escapeHtml(String(value))}"`;
    })
    .filter(Boolean);
  // When no style prop was passed, still emit display:contents.
  if (!('style' in attrs)) parts.push('style="display:contents"');
  return parts.length ? ' ' + parts.join(' ') : '';
}

function prepareProps(props, hydrated) {
  if (!props || typeof props !== 'object') return Promise.resolve({ real: props, json: props });
  const entries = Object.entries(props);
  return Promise.all(entries.map(([, v]) => prepareValue(v, hydrated))).then((results) => {
    const real = {};
    const json = {};
    entries.forEach(([key], i) => {
      real[key] = results[i].real;
      if (results[i].json !== undefined) json[key] = results[i].json;
    });
    return { real, json };
  });
}

async function prepareValue(value, hydrated) {
  if (value === null || value === undefined) return { real: value, json: value };
  if (typeof value === 'function') return { real: value, json: undefined };
  if (typeof value !== 'object') return { real: value, json: value };

  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((v) => prepareValue(v, hydrated)));
    return {
      real: items.map((i) => i.real),
      json: items.map((i) => i.json).filter((i) => i !== undefined),
    };
  }

  if (value.$$typeof) return prepareElement(value, hydrated);

  const out = await prepareProps(value, hydrated);
  return out;
}

// Resolves a single React element found inside a client component's props.
// Native elements and fragments recurse into their own props. Client
// components are left untouched for 'real' (react-dom/server renders them
// normally within the boundary's own renderToString call below) and wired
// through as { __re: 'client', componentId, props } for the browser to
// mount for real. Server components can't run in the browser at all, so
// they're rendered once with this same file's renderNode() (handles async
// components and any nested client boundaries inside them) and wrapped in
// an inert <span style="display:contents"> carrying that HTML —
// identically on both 'real' and 'json', so the SSR markup and the
// browser's reconstructed tree have the same shape and hydrateRoot() can
// reconcile them without a mismatch.
async function prepareElement(element, hydrated) {
  const { type, props } = element;

  if (type === Symbol.for('react.fragment')) {
    const p = await prepareProps(props, hydrated);
    return { real: __createElement__(Symbol.for('react.fragment'), p.real), json: { __re: 'fragment', props: p.json } };
  }

  if (typeof type === 'string') {
    const p = await prepareProps(props, hydrated);
    return { real: __createElement__(type, p.real), json: { __re: 'html', tag: type, props: p.json } };
  }

  if (typeof type === 'function') {
    const cid = type.__nukeClientId ?? CLIENT_COMPONENTS[type.name];
    if (cid) {
      const p = await prepareProps(props, hydrated);
      return { real: element, json: { __re: 'client', componentId: cid, props: p.json } };
    }

    const html = await renderNode(element, hydrated);
    const wrapperProps = {
      style: { display: 'contents' },
      'data-n-static': true,
      dangerouslySetInnerHTML: { __html: html },
    };
    return { real: __createElement__('span', wrapperProps), json: { __re: 'static', html } };
  }

  return { real: element, json: undefined };
}

async function renderNode(node: any, hydrated: Set<string>): Promise<string> {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return escapeHtml(node);
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return (await Promise.all(node.map(n => renderNode(n, hydrated)))).join('');

  const { type, props } = node as { type: any; props: Record<string, any> };
  if (!type) return '';

  if (type === Symbol.for('react.fragment')) return renderNode(props?.children ?? null, hydrated);

  if (typeof type === 'string') {
    const { children, dangerouslySetInnerHTML, ...rest } = props || {};
    const attrParts: string[] = [];
    for (const [k, v] of Object.entries(rest as Record<string, any>)) {
      const name = k === 'className' ? 'class' : k === 'htmlFor' ? 'for' : k;
      if (typeof v === 'boolean') { if (v) attrParts.push(name); continue; }
      if (v == null) continue;
      if (k === 'style' && typeof v === 'object') {
        const css = Object.entries(v as Record<string, any>)
          .map(([p, val]) => `${p.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}:${escapeHtml(String(val))}`)
          .join(';');
        attrParts.push(`style="${css}"`);
        continue;
      }
      attrParts.push(`${name}="${escapeHtml(String(v))}"`);
    }
    const attrStr = attrParts.length ? ' ' + attrParts.join(' ') : '';
    if (VOID_TAGS.has(type)) return `<${type}${attrStr} />`;
    const inner = dangerouslySetInnerHTML
      ? (dangerouslySetInnerHTML as any).__html
      : await renderNode(children ?? null, hydrated);
    return `<${type}${attrStr}>${inner}</${type}>`;
  }

  if (typeof type === 'function') {
    const clientId = (type as any).__nukeClientId ?? CLIENT_COMPONENTS[type.name];
    if (clientId) {
      hydrated.add(clientId);
      const { wrapperAttrs, componentProps } = splitWrapperAttrs(props);
      const wrapperAttrStr  = buildWrapperAttrString(wrapperAttrs);
      const { real: hydrationSafeProps, json: serializedProps } = await prepareProps(componentProps ?? {}, hydrated);
      let ssrHtml: string;
      try {
        ssrHtml = __renderToString__(__createElement__(type as any, hydrationSafeProps || {}));
      } catch {
        ssrHtml = PRERENDERED_HTML[clientId] ?? '';
      }
      return `<span data-hydrate-id="${clientId}"${wrapperAttrStr} data-hydrate-props="${escapeHtml(JSON.stringify(serializedProps))}">${ssrHtml}</span>`;
    }
    const instance = type.prototype?.isReactComponent ? new (type as any)(props) : null;
    return renderNode(instance ? instance.render() : await (type as Function)(props || {}), hydrated);
  }

  return '';
}

// ─── Layout wrapping ──────────────────────────────────────────────────────────
const LAYOUT_COMPONENTS: Array<(props: any) => any> = [__layout_0__];

function wrapWithLayouts(element: any): any {
  let el = element;
  for (let i = LAYOUT_COMPONENTS.length - 1; i >= 0; i--)
    el = { type: LAYOUT_COMPONENTS[i], props: { children: el }, key: null, ref: null };
  return el;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const parsed = new URL(req.url || '/', 'http://localhost');
    const url      = req.url || '/';
    const pathname = parsed.pathname;

    // Route params are injected as query-string keys by the server entry.
    // Build 'params' only from known route segments, and 'query' from the rest.
    const params: Record<string, string | string[]> = {};
    ROUTE_PARAM_NAMES.forEach(k => {
      if (CATCH_ALL_NAMES.has(k)) {
        params[k] = parsed.searchParams.getAll(k);
      } else {
        const v = parsed.searchParams.get(k);
        if (v !== null) params[k] = v;
      }
    });

    const query: Record<string, string | string[]> = {};
    parsed.searchParams.forEach((_, k) => {
      if (!ROUTE_PARAM_NAMES.has(k)) {
        const all = parsed.searchParams.getAll(k);
        query[k] = all.length > 1 ? all : all[0];
      }
    });

    const rawHeaders  = req.headers as Record<string, string | string[] | undefined>;
    // Full headers (including credentials) for server components via the request store.
    const normHeaders = normaliseHeaders(rawHeaders);
    // Stripped headers safe for embedding in the HTML document.
    const safeHeaders = sanitiseHeaders(rawHeaders);

    const hydrated = new Set<string>();
    // Merge query params into page props to match dev behaviour (ssr.ts mergedParams).
    // Error props (__errorMessage, __errorStack, __errorStatus) are injected by the
    // server entry when routing to _500.mjs after a handler failure.
    const errorProps: Record<string, string | undefined> = {};
    const ep = parsed.searchParams;
    if (ep.has('__errorMessage')) errorProps.errorMessage = ep.get('__errorMessage') ?? undefined;
    if (ep.has('__errorStack'))   errorProps.errorStack   = ep.get('__errorStack')   ?? undefined;
    if (ep.has('__errorStatus'))  errorProps.errorStatus  = ep.get('__errorStatus')  ?? undefined;

    const merged = { ...query, ...params, ...errorProps } as any;
    const wrapped  = wrapWithLayouts({ type: __page__.default, props: merged, key: null, ref: null });

    let appHtml = '';
    const store = await runWithRequestStore(
      { url, pathname, params, query, headers: normHeaders },
      () => runWithCacheStore(() => runWithHtmlStore(async () => { appHtml = await renderNode(wrapped, hydrated); })),
    );

    const pageTitle = resolveTitle(store.titleOps, 'NukeJS');
    const headScripts = store.script.filter((s: any) => (s.position ?? 'head') === 'head');
    const bodyScripts = store.script.filter((s: any) => s.position === 'body');
    const headLines = [
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      `  <title>${escapeHtml(pageTitle)}</title>`,
      ...(store.meta.length || store.link.length || store.style.length || headScripts.length ? [
        '  <!--n-head-->',
        ...store.meta.map(renderMetaTag),
        ...store.link.map(renderLinkTag),
        ...store.style.map(renderStyleTag),
        ...headScripts.map(renderScriptTag),
        '  <!--/n-head-->',
      ] : []),
    ];
    const bodyScriptLines = bodyScripts.length
      ? ['  <!--n-body-scripts-->', ...bodyScripts.map(renderScriptTag), '  <!--/n-body-scripts-->']
      : [];
    const bodyScriptsHtml = bodyScriptLines.length ? '\n' + bodyScriptLines.join('\n') + '\n' : '';

    const runtimeData = JSON.stringify({
      hydrateIds: [...hydrated], allIds: ALL_CLIENT_IDS, url, params,
      query, headers: safeHeaders, debug: 'silent',
    }).replace(/</g, '\u003c').replace(/>/g, '\u003e').replace(/&/g, '\u0026');

    const html = `<!DOCTYPE html>
${openTag('html', store.htmlAttrs)}
<head>
${headLines.join('\n')}
</head>
${openTag('body', store.bodyAttrs)}
  <div id="app">${appHtml}</div>

  <script id="__n_data" type="application/json">${runtimeData}</script>

  ${hydrated.size > 0 ? `<script type="importmap">
  {
    "imports": {
      "react":             "/__n.js",
      "react-dom/client":  "/__n.js",
      "react/jsx-runtime": "/__n.js",
      "nukejs":            "/__n.js"
    }
  }
  </script>

  <script type="module">
    const { initRuntime } = await import('nukejs');
    const data = JSON.parse(document.getElementById('__n_data').textContent);
    await initRuntime(data);
  </script>` : ''}
${bodyScriptsHtml}</body>
</html>`;

    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(minifyHtml(html));
  } catch (err: any) {
    // Re-throw so the server entry (build-node / build-vercel) can route to
    // the _500 page handler. Do not swallow the error here.
    throw err;
  }
}
