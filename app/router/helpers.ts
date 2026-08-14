import type { ServerResponse } from "node:http";
import { setAccessCookie, setRefreshCookie } from "../lib-server/cookies";
import { signAccessToken, signRefreshToken } from "../lib-server/jwt";
import { getPermissionsForUser } from "../lib-server/permissions";

export const OTP_TTL_SECONDS = 120; // 2 minutes
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

// Mints a fresh access/refresh cookie pair for a user and returns the
// permissions that ended up in the access token — shared by both the
// "just verified an OTP" path and (in the future) any other place a
// session needs to be started from scratch.
export async function issueSession(res: ServerResponse, userId: string) {
    const permissions = getPermissionsForUser({ _id: userId } as any);
    setAccessCookie(res, signAccessToken({ _id: userId, permissions }));
    setRefreshCookie(res, signRefreshToken({ _id: userId }));
    return permissions;
}