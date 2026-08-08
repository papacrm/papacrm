import type { IncomingMessage, ServerResponse } from "node:http";
import { os } from "@orpc/server";

// Every procedure gets the raw Node req/res. Handlers use `req` to read the
// Cookie header and `res` to set/clear the access + refresh cookies directly
// — there's no separate session store, the cookies *are* the session.
export interface ORPCContext {
    req: IncomingMessage;
    res: ServerResponse;
}

export const base = os.$context<ORPCContext>();
