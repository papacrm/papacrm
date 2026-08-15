import type { IncomingMessage, ServerResponse } from "node:http";
import { renderComponent } from "nukejs/server";
import { parseCookie, stringifySetCookie } from "cookie";
import { connectDB } from "../../app/lib-server/mongoose";
import Module from "../../app/lib-server/models/Module";
import { findWebhookNode, runModule } from "../../app/lib-server/moduleEngine";
import { WEBHOOK_PAGE_COMPONENTS } from "@/app/components/webhooks/registry";
import { withPageExtras } from "@/app/components/webhooks/PageExtras";
import RootLayout from "@/app/pages/layout";

interface ApiRequest extends IncomingMessage {
    params: Record<string, string | string[]>;
    query: Record<string, string>;
    json: () => Promise<any>;
    text: () => Promise<string>;
}

interface ApiResponse extends ServerResponse {
    json: (data: unknown, status?: number) => void;
}

// Any request to /hooks/<anything> lands here — <anything> is whatever
// path a module's webhook node was configured with in the editor (see
// app/components/modules/ModuleEditor.tsx). Nothing here is behind
// auth: webhooks are meant to be hit by outside services.
async function handle(req: ApiRequest, res: ApiResponse) {
    const segments = req.params.path;
    const path = Array.isArray(segments) ? segments.join("/") : String(segments ?? "");
    const method = (req.method || "GET").toUpperCase();

    await connectDB();

    // Webhook paths aren't uniquely indexed (a user could reuse a slug
    // across a couple of draft modules before activating one), so this
    // scans active modules and takes the first path+method match — fine
    // at this project's scale.
    const modules = await Module.find({ active: true }).lean();

    let match: { module: (typeof modules)[number]; nodeId: string } | undefined;
    for (const module of modules) {
        const node = findWebhookNode(module.nodes as any, path, method);
        if (node) {
            match = { module, nodeId: node.id };
            break;
        }
    }

    if (!match) {
        res.json({ error: "No active module is listening on this webhook" }, 404);
        return;
    }

    let body: unknown = null;
    if (method !== "GET" && method !== "HEAD") {
        const contentType = String(req.headers["content-type"] ?? "");
        try {
            if (contentType.includes("application/json")) {
                body = await req.json();
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                // Submissions from an Input Form node arrive this way.
                body = Object.fromEntries(new URLSearchParams(await req.text()));
            } else {
                body = await req.text();
            }
        } catch {
            body = null;
        }
    }

    // Request headers, lower-cased for predictable lookups by Get Header —
    // Node already lower-cases these, but normalize regardless of runtime.
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers[key.toLowerCase()] = value;
        else if (Array.isArray(value)) headers[key.toLowerCase()] = value.join(", ");
    }
    const cookies = parseCookie(headers.cookie ?? "") as Record<string, string>;

    const result = await runModule(
        match.module.nodes as any,
        match.module.edges as any,
        match.nodeId,
        { method, path, query: req.query, body, headers, cookies },
        String(match.module._id),
    );

    // Set Header / Set Cookie nodes queue onto the result regardless of
    // which kind of response the run ends with — apply them before
    // writing anything else.
    if (result.headers) {
        for (const [name, value] of Object.entries(result.headers)) {
            res.setHeader(name, value);
        }
    }
    if (result.cookies) {
        for (const cookie of result.cookies) {
            const existing = res.getHeader("Set-Cookie");
            const value = stringifySetCookie({
                name: cookie.name,
                value: cookie.value,
                httpOnly: cookie.httpOnly ?? false,
                path: "/",
                maxAge: cookie.maxAge,
            });
            res.setHeader("Set-Cookie", existing ? (Array.isArray(existing) ? [...existing, value] : [String(existing), value]) : [value]);
        }
    }

    if (result.kind === "page") {
        // Real NukeJS SSR instead of a hand-built HTML string: the page
        // gets the app's shared RootLayout (stylesheet, favicon, title
        // template) and whatever reactivity the component itself wires up
        // via useHtml() (see app/components/webhooks/WebhookInputForm.tsx).
        // withPageExtras applies whatever Html/Load CSS/State nodes queued
        // onto this run (see PageExtras.tsx) regardless of which page node
        // actually produced `result`.
        const Component = withPageExtras(WEBHOOK_PAGE_COMPONENTS[result.page.component], {
            htmlAttrs: result.htmlAttrs,
            styles: result.styles,
            scripts: result.scripts,
        });
        const html = await renderComponent(Component, result.page.props, {
            layouts: [RootLayout],
            url: req.url,
            query: req.query,
            title: result.page.title,
        });
        res.statusCode = result.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
        return;
    }

    if (result.kind === "json") {
        res.json(result.data, result.status);
        return;
    }

    if (result.kind === "text") {
        res.statusCode = result.status;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(result.text);
        return;
    }

    res.statusCode = result.status;
    res.end();
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;