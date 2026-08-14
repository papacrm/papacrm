"use client";

import type { AccessTokenPayload } from "@/app/lib-server/jwt";

const ACCESS_COOKIE_NAME = "access_token";

export interface DecodedAccessToken extends AccessTokenPayload {
    exp?: number;
}

function readCookie(name: string): string | undefined {
    if (typeof document === "undefined") return undefined;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
}

// access_token is deliberately NOT httpOnly (see lib/cookies.ts) so the
// client can read its payload directly instead of round-tripping to
// auth.me() just to know who's signed in and what they can do. This is a
// plain base64url decode of the JWT payload segment — it does NOT verify
// the signature, and it doesn't need to: nothing security-sensitive relies
// on this being trustworthy, it's only used to paint the UI. Every
// protected oRPC call still re-verifies the real cookie server-side (see
// lib/orpc/auth.ts).
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payloadSeg = token.split(".")[1];
        if (!payloadSeg) return null;

        const base64 = payloadSeg.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const json = decodeURIComponent(
            atob(padded)
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join(""),
        );

        return JSON.parse(json);
    } catch {
        return null;
    }
}

// Reads permissions (and the rest of the access token's claims, including
// `exp`) straight from the access_token cookie — no network round trip.
// Returns null if there's no cookie, or if it doesn't look like a valid
// access token payload (e.g. it's missing, malformed, or was tampered
// with — the server will reject it the same way on the next protected
// call).
export function getAccessTokenFromCookie(): DecodedAccessToken | null {
    const token = readCookie(ACCESS_COOKIE_NAME);
    if (!token) return null;

    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload._id !== "string") return null;

    return {
        _id: payload._id,
        permissions: Array.isArray(payload.permissions) ? (payload.permissions as string[]) : [],
        exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
}