import { encode, decode } from "@kav3/jwt";

import 'dotenv/config'

const ACCESS_SECRET = process.env.ACCESS_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

if (!ACCESS_SECRET) throw new Error("ACCESS_SECRET environment variable is not set");
if (!REFRESH_SECRET) throw new Error("REFRESH_SECRET environment variable is not set");

// Access tokens are short-lived — they're what protected oRPC procedures
// check on every call. Refresh tokens are long-lived and only ever used to
// mint a new access token.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AccessTokenPayload {
    _id: string;
    permissions: string[];
}

export interface RefreshTokenPayload {
    _id: string;
}

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

export function signAccessToken(payload: AccessTokenPayload): string {
    return encode({ ...payload, exp: nowSeconds() + ACCESS_TOKEN_TTL_SECONDS }, ACCESS_SECRET);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
    return encode({ ...payload, exp: nowSeconds() + REFRESH_TOKEN_TTL_SECONDS }, REFRESH_SECRET);
}

// @kav3/jwt's decode() verifies the signature and throws if the token is
// malformed, has a bad signature, or is past its `exp` claim — so a
// successful return here means the token is authentic and still valid.
export function verifyAccessToken(token: string): AccessTokenPayload {
    const payload = decode(token, ACCESS_SECRET);
    return { _id: payload._id, permissions: payload.permissions ?? [] };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = decode(token, REFRESH_SECRET);
    return { _id: payload._id };
}
