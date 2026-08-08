import type { IncomingMessage, ServerResponse } from "node:http";
import { connectDB } from "../../lib/mongoose";
import Workflow from "../../lib/models/Workflow";
import { findWebhookNode, runWorkflow } from "../../lib/workflowEngine";

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
// path a workflow's webhook node was configured with in the editor (see
// app/components/workflows/WorkflowEditor.tsx). Nothing here is behind
// auth: webhooks are meant to be hit by outside services.
async function handle(req: ApiRequest, res: ApiResponse) {
    const segments = req.params.path;
    const path = Array.isArray(segments) ? segments.join("/") : String(segments ?? "");
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

    if (!match) {
        res.json({ error: "No active workflow is listening on this webhook" }, 404);
        return;
    }

    let body: unknown = null;
    if (method !== "GET" && method !== "HEAD") {
        const contentType = String(req.headers["content-type"] ?? "");
        try {
            if (contentType.includes("application/json")) {
                body = await req.json();
            } else if (contentType.includes("application/x-www-form-urlencoded")) {
                // Submissions from an Input Form step arrive this way.
                body = Object.fromEntries(new URLSearchParams(await req.text()));
            } else {
                body = await req.text();
            }
        } catch {
            body = null;
        }
    }

    const result = await runWorkflow(
        match.workflow.nodes as any,
        match.workflow.edges as any,
        match.nodeId,
        { method, query: req.query, body },
        String(match.workflow._id),
    );

    if (result.kind === "html") {
        res.statusCode = result.status;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(result.html);
        return;
    }

    if (result.kind === "json") {
        res.json(result.data, result.status);
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