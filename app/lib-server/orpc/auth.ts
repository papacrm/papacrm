import { ORPCError } from "@orpc/server";
import { base } from "./context";
import { readCookies, ACCESS_COOKIE_NAME } from "../cookies";
import { verifyAccessToken } from "../jwt";

// Every procedure — protected or not — can use `base` directly.
export const pub = base;

// Guards a procedure behind a valid access token. Throws a 401 ORPCError if
// the access_token cookie is missing, malformed, expired, or signed with the
// wrong secret. The client is expected to catch this specific status, call
// auth.refresh, and retry — see client.ts's `withAuthRetry`.
export const authed = base.use(async ({ context, next }) => {
    const cookies = readCookies(context.req.headers.cookie);
    const token = cookies[ACCESS_COOKIE_NAME];

    if (!token) {
        throw new ORPCError("UNAUTHORIZED", { status: 401, message: "Missing access token" });
    }

    try {
        const payload = verifyAccessToken(token);
        return next({ context: { user: payload } });
    } catch {
        throw new ORPCError("UNAUTHORIZED", { status: 401, message: "Invalid or expired access token" });
    }
});
