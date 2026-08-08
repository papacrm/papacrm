import type { IncomingMessage, ServerResponse } from "http";
import { readCookies, REFRESH_COOKIE_NAME } from "./lib/cookies";
import { verifyRefreshToken } from "./lib/jwt";

// The default locale is served unprefixed at "/" (e.g. "/", "/about").
// Any other supported locale keeps its prefix (e.g. "/fr", "/fr/about").
const DEFAULT_LOCALE = "en";

// Locales that keep a URL prefix. Must stay in sync with the `translations`
// keys in app/lib/useI18n.ts (everything except DEFAULT_LOCALE).
const PREFIXED_LOCALES = ["fr"];

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