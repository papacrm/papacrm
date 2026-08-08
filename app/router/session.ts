import { ORPCError } from "@orpc/server";
import { pub, authed } from "../../lib/orpc/auth";
import { connectDB } from "../../lib/mongoose";
import User from "../../lib/models/User";
import {
    readCookies,
    REFRESH_COOKIE_NAME,
    setAccessCookie,
    clearAuthCookies,
} from "../../lib/cookies";
import { signAccessToken, verifyRefreshToken, ACCESS_TOKEN_TTL_SECONDS } from "../../lib/jwt";
import { getPermissionsForUser } from "../../lib/permissions";

// Mints a fresh access token from a valid refresh token. Called by the
// client automatically after any protected call comes back 401 — see
// client.ts's `withAuthRetry`.
export const refresh = pub.handler(async ({ context }) => {
    const cookies = readCookies(context.req.headers.cookie);
    const token = cookies[REFRESH_COOKIE_NAME];

    if (!token) {
        // No refresh token at all — there's no way to recover a
        // session, the client should treat this as "log in again".
        throw new ORPCError("NO_SESSION", { status: 402, message: "No refresh token" });
    }

    let payload: { _id: string };
    try {
        payload = verifyRefreshToken(token);
    } catch {
        throw new ORPCError("NO_SESSION", { status: 402, message: "Refresh token invalid or expired" });
    }

    await connectDB();
    const user = await User.findById(payload._id).lean();

    if (!user) {
        throw new ORPCError("NO_SESSION", { status: 402, message: "User no longer exists" });
    }

    const permissions = getPermissionsForUser(user);
    setAccessCookie(context.res, signAccessToken({ _id: String(user._id), permissions }));

    return { permissions, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
});

export const logout = pub.handler(async ({ context }) => {
    clearAuthCookies(context.res);
    return { ok: true };
});

// Protected — anything under /d can call this to get the current user's id
// + permissions straight from a verified access token. The dashboard reads
// permissions from the access_token cookie directly for its initial paint
// (see app/lib/session.ts) and only calls this on demand, e.g. via the
// "Check /me" button, to exercise the real 401 -> refresh -> retry flow.
export const me = authed.handler(async ({ context }) => {
    return { _id: context.user._id, permissions: context.user.permissions };
});