import type { IncomingMessage, ServerResponse } from "node:http";
import { RPCHandler } from "@orpc/server/node";
import { onError } from "@orpc/server";
import { router } from "../../app/router";

const handler = new RPCHandler(router, {
    interceptors: [
        onError((error) => {
            console.error(error);
        }),
    ],
});

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    const { matched } = await handler.handle(req, res, {
        prefix: "/rpc",
        context: { req, res },
    });

    if (matched) return;

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: 404 }));
}

export const HEAD = handleRequest;
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;