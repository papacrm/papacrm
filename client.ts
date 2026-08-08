import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Router } from "./app/router";

const baseURL =
    typeof window !== "undefined" ? `${window.location.origin}/rpc` : process.env.RPC_URL || "http://localhost:3000/rpc";

const link = new RPCLink({ url: baseURL });

export const orpc: RouterClient<Router> = createORPCClient(link);

// Wraps any orpc call with the access/refresh retry dance:
//   1. run the call
//   2. if it fails with 401 (access token missing/expired), call auth.refresh
//   3. if refresh succeeds (a new access cookie is now set), retry the call once
//   4. if refresh fails with 402, there's no session to recover from — bounce
//      to /login
//
// Usage: const me = await withAuthRetry(() => orpc.auth.me())
export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (!(err instanceof ORPCError) || err.status !== 401) {
            throw err;
        }

        try {
            await orpc.auth.refresh();
        } catch (refreshErr) {
            if (refreshErr instanceof ORPCError && refreshErr.status === 402 && typeof window !== "undefined") {
                window.location.href = "/login";
            }
            throw refreshErr;
        }

        return await fn();
    }
}