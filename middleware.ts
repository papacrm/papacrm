import type { IncomingMessage, ServerResponse } from "http";
import { renderComponent } from "nukejs/server";
import { readCookies, REFRESH_COOKIE_NAME } from "./lib/cookies";
import { verifyRefreshToken } from "./lib/jwt";
import { connectDB } from "./lib/mongoose";
import Workflow from "./lib/models/Workflow";
import { findWebhookNode, runWorkflow } from "./lib/workflowEngine";
import { WEBHOOK_PAGE_COMPONENTS } from "./app/components/webhooks/registry";
import RootLayout from "./app/pages/layout";

// The default locale is served unprefixed at "/" (e.g. "/", "/about").
// Any other supported locale keeps its prefix (e.g. "/fr", "/fr/about").
const DEFAULT_LOCALE = "en";

// Locales that keep a URL prefix. Must stay in sync with the `translations`
// keys in app/lib/useI18n.ts (everything except DEFAULT_LOCALE).
const PREFIXED_LOCALES = ["fr"];

// ─── Workflow webhooks (served at the root, e.g. "/my-endpoint") ────────
//
// Workflows used to be served under a dedicated "/hooks" prefix via
// server/hooks/[...path].ts. They now live at the root of the app instead,
// so a webhook node configured with path "orders/new" responds at
// "/orders/new" rather than "/hooks/orders/new".
//
// NukeJS's file-based server router gives *any* route under server/ (an
// index.ts included) priority over the page router — an unprefixed
// catch-all route file there would intercept every request, including real
// pages like "/login" or "/d", before the page renderer ever saw them.
// That's not workable for something as free-form as a user-defined webhook
// path. Doing the lookup here instead, ahead of routing, avoids that: real
// pages are excluded up front (see RESERVED_SLUGS below) and everything
// else only reaches the workflow engine if an active workflow is actually
// listening on it — otherwise it falls through to normal routing exactly
// as before.
//
// Top-level path segments that belong to a real page and must never be
// shadowed by a workflow's webhook path.
const RESERVED_SLUGS = new Set(["d", "login", ...PREFIXED_LOCALES]);

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

function sendJson(res: ServerResponse, data: unknown, status: number) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
}

// Looks for an active workflow whose webhook (or Input Form) trigger is
// listening on `pathname`/`method`, and if one exists, runs it and writes
// the response. Returns true if it handled the request, false if the
// caller should fall through to normal page routing.
async function tryHandleWebhook(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    query: Record<string, string>,
): Promise<boolean> {
    const path = pathname.replace(/^\/+/, "");
    const method = (req.method || "GET").toUpperCase();

    await connectDB();

    // Webhook paths aren't uniquely indexed (a user could reuse a slug
    // across a couple of draft workflows before activating one), so this
    // scans active workflows and takes the first path+method match — fine
    // at this project's scale.
    const workflows = await Workflow.find({ active: true }).lean();

    let match: { workflow: (typeof workflows)[number]; nodeId: string } | undefined;
    for (const workflow of workflows) {
        const node = findWebhookNode(workflow.nodes as any, path, method);
        if (node) {
            match = { workflow, nodeId: node.id };
            break;
        }
    }

    if (!match) return false;

    let body: unknown = null;
    if (method !== "GET" && method !== "HEAD") {
        const contentType = String(req.headers["content-type"] ?? "");
        try {
            const raw = (await readRequestBody(req)).toString("utf8");
            if (contentType.includes("application/json")) {
                body = raw ? JSON.parse(raw) : null;
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                // Submissions from an Input Form step arrive this way.
                body = Object.fromEntries(new URLSearchParams(raw));
            } else {
                body = raw;
            }
        } catch {
            body = null;
        }
    }

    const result = await runWorkflow(
        match.workflow.nodes as any,
        match.workflow.edges as any,
        match.nodeId,
        { method, query, body },
        String(match.workflow._id),
    );

    if (result.kind === "page") {
        // Real NukeJS SSR instead of a hand-built HTML string: the page
        // gets the app's shared RootLayout (stylesheet, favicon, title
        // template) and whatever reactivity the component itself wires up
        // via useHtml() (see app/components/webhooks/WebhookInputForm.tsx).
        const Component = WEBHOOK_PAGE_COMPONENTS[result.page.component];
        const html = await renderComponent(Component, result.page.props, {
            layouts: [RootLayout],
            url: req.url,
            query,
            title: result.page.title,
        });
        res.statusCode = result.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return true;
    }

    if (result.kind === "json") {
        sendJson(res, result.data, result.status);
        return true;
    }

    res.statusCode = result.status;
    res.end();
    return true;
}

// ─── Dev-only Tailwind watcher ──────────────────────────────────────────
//
// This file is bundled into three different runtimes:
//   - a plain Node http server        (`nuke dev` / `nuke build`)
//   - a Vercel Node function          (`nuke build --vercel`)
//   - a Cloudflare Worker / V8 isolate with a Node req/res shim
//     (`nuke build --cloudflare`, bundled with esbuild `platform: "browser"`,
//     Node builtins NOT externalized)
//
// `child_process` only exists in the first two. Two things keep this safe
// everywhere:
//   1. `isDev` is `process.env.NODE_ENV !== "production"`. Both the Vercel
//      and Cloudflare build scripts run esbuild with
//      `define: { "process.env.NODE_ENV": '"production"' }`, so in those
//      builds this folds to `false` at build time and the branch is dead
//      code — it's never reached at runtime even if a bundler doesn't fully
//      eliminate it.
//   2. The module specifier is a runtime string, not a static literal, so
//      esbuild can't (and doesn't try to) resolve/bundle "child_process" at
//      build time — it's left as a plain runtime `import()` call. Combined
//      with (1), it's never actually evaluated outside local dev.
const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
    const childProcessModule = "child_process";
    const { spawn } = await import(childProcessModule);

    spawn(
        "npx",
        [
            "@tailwindcss/cli",
            "-i",
            "./global.css",
            "-o",
            "./app/public/styles.css",
            "--watch",
        ],
        { stdio: "inherit", shell: true },
    );
}

export default async function middleware(
    req: IncomingMessage,
    res: ServerResponse,
) {
    const rawUrl = req.url ?? "/";
    const queryIndex = rawUrl.indexOf("?");
    const pathname = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);
    const query = queryIndex === -1 ? "" : rawUrl.slice(queryIndex);

    // Skip framework internals, API routes, oRPC routes, and static assets
    // (anything with a file extension, e.g. /favicon.ico, /styles.css).
    if (
        pathname.startsWith("/__") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/rpc") ||
        /\.[a-zA-Z0-9]+$/.test(pathname)
    ) {
        return;
    }

    // A workflow webhook takes priority over everything below — but never
    // over a real page, so reserved top-level slugs ("/d", "/login", "/fr")
    // are excluded before we even hit the database. The homepage ("/") is
    // NOT excluded: an active workflow can claim it (e.g. path set to
    // empty/"/"), and if none does, the lookup just returns no match and
    // falls through to the static homepage exactly as before.
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    if (!RESERVED_SLUGS.has(firstSegment)) {
        const query = Object.fromEntries(new URL(rawUrl, "http://localhost").searchParams);
        const handled = await tryHandleWebhook(req, res, pathname, query);
        if (handled) return;
    }

    // Canonicalize the default locale: `/en` and `/en/...` permanently
    // redirect to their unprefixed equivalent (`/`, `/...`). This keeps a
    // single canonical URL per page for SEO and avoids duplicate-content
    // issues between `/` and `/en`.
    if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
        const rest = pathname.slice(`/${DEFAULT_LOCALE}`.length) || "/";
        res.statusCode = 301;
        res.setHeader("Location", rest + query);
        res.end();
        return;
    }

    // The file-based router treats `app/pages/[locale]/index.tsx` as a
    // dynamic segment that structurally matches ANY single path segment
    // (and normalizes trailing slashes before matching), so `/anything` or
    // `/anything/` would otherwise render the page with `params.locale =
    // "anything"` — and useI18n() silently falls back to English instead of
    // 404ing. Reject single-segment paths that aren't a real prefixed
    // locale here, before routing ever sees them.
    //
    // NOTE: this project currently has exactly one page (the homepage),
    // mirrored across locales. If you add more top-level unprefixed pages
    // later (e.g. app/pages/about.tsx), add their slugs to this allowlist
    // too — otherwise they'll get caught by this check and 404.
    const ALLOWED_UNPREFIXED_SLUGS: string[] = ["d", "login"];
    const segments = pathname.split("/").filter(Boolean);
    if (
        segments.length === 1 &&
        !PREFIXED_LOCALES.includes(segments[0]) &&
        !ALLOWED_UNPREFIXED_SLUGS.includes(segments[0])
    ) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not Found");
        return;
    }

    // ─── /d auth guard ──────────────────────────────────────────────────
    //
    // Gate the whole /d folder on a valid refresh_token cookie (the
    // long-lived cookie — access_token is short-lived and gets refreshed
    // transparently client-side, see client.ts's `withAuthRetry`). This is
    // a real signature+expiry check, not just a "cookie is present" check.
    //
    // NOTE: verifyRefreshToken() uses node:crypto (via @kav3/jwt). That's
    // fine for local dev and the Node/Vercel builds. If you deploy this to
    // Cloudflare, add `compatibility_flags = ["nodejs_compat"]` to
    // wrangler.toml so node:crypto is available in the Worker isolate.
    if (pathname === "/d" || pathname.startsWith("/d/")) {
        const cookies = readCookies(req.headers.cookie);
        const refreshToken = cookies[REFRESH_COOKIE_NAME];

        let authenticated = false;
        if (refreshToken) {
            try {
                verifyRefreshToken(refreshToken);
                authenticated = true;
            } catch {
                // expired / bad signature / malformed — falls through as unauthenticated
            }
        }

        if (!authenticated) {
            res.statusCode = 302;
            res.setHeader("Location", "/login");
            res.end();
            return;
        }
    }

    // Everything else — unprefixed paths (served as the default locale) and
    // prefixed non-default locales (e.g. `/fr`) — passes through to routing.
}