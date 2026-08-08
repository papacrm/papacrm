import type { ServerResponse } from "node:http";
import { parseCookie, stringifySetCookie } from "cookie";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from "./jwt";

export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";

const isProd = process.env.NODE_ENV === "production";

export function readCookies(cookieHeader: string | undefined | null): Record<string, string | undefined> {
    return parseCookie(cookieHeader ?? "");
}

// A response can carry more than one Set-Cookie header, so every helper here
// *appends* rather than overwrites — never call res.setHeader('Set-Cookie', ...)
// directly alongside these or you'll clobber a previous cookie.
function appendSetCookie(res: ServerResponse, value: string) {
    const existing = res.getHeader("Set-Cookie");
    const next = existing ? (Array.isArray(existing) ? [...existing, value] : [String(existing), value]) : [value];
    res.setHeader("Set-Cookie", next);
}

// refresh_token: httpOnly — never touched by client-side JS, only ever read
// by the server to mint new access tokens.
export function setRefreshCookie(res: ServerResponse, token: string) {
    appendSetCookie(
        res,
        stringifySetCookie({
            name: REFRESH_COOKIE_NAME,
            value: token,
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: REFRESH_TOKEN_TTL_SECONDS,
        }),
    );
}

// access_token: a normal (non-httpOnly) cookie on purpose, so client-side JS
// can read it to know the current user's permissions without an extra call.
// It's still sent automatically on same-origin oRPC requests, and it's what
// protected procedures check server-side too.
export function setAccessCookie(res: ServerResponse, token: string) {
    appendSetCookie(
        res,
        stringifySetCookie({
            name: ACCESS_COOKIE_NAME,
            value: token,
            httpOnly: false,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_TTL_SECONDS,
        }),
    );
}

export function clearAuthCookies(res: ServerResponse) {
    appendSetCookie(
        res,
        stringifySetCookie({
            name: REFRESH_COOKIE_NAME,
            value: "",
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        }),
    );
    appendSetCookie(
        res,
        stringifySetCookie({
            name: ACCESS_COOKIE_NAME,
            value: "",
            httpOnly: false,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        }),
    );
}
