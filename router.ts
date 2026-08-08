import { ORPCError } from "@orpc/server";
import { pub, authed } from "./lib/orpc/auth";
import { connectDB } from "./lib/mongoose";
import User from "./lib/models/User";
import { readCookies, REFRESH_COOKIE_NAME, setAccessCookie, setRefreshCookie, clearAuthCookies } from "./lib/cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken, ACCESS_TOKEN_TTL_SECONDS } from "./lib/jwt";
import { getPermissionsForUser } from "./lib/permissions";

const OTP_TTL_SECONDS = 120; // 2 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

async function issueSession(res: import("node:http").ServerResponse, userId: string) {
    const permissions = getPermissionsForUser({ _id: userId } as any);
    setAccessCookie(res, signAccessToken({ _id: userId, permissions }));
    setRefreshCookie(res, signRefreshToken({ _id: userId }));
    return permissions;
}

export const router = {
    auth: {
        // Step 1 of login: collect an email address, issue + "send" an OTP.
        requestOtp: pub.handler(async ({ input, context }) => {
            const email = String((input as any)?.email ?? "").trim().toLowerCase();

            if (!EMAIL_RE.test(email)) {
                throw new ORPCError("BAD_REQUEST", { status: 400, message: "Enter a valid email address" });
            }

            await connectDB();

            const otp = generateOtp();
            const expired = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

            await User.findOneAndUpdate({ email }, { otp, expired }, { upsert: true, new: true });

            // No email provider wired up here — swap this for e.g. Resend,
            // Postmark, or SES in production. In dev, log it to the console
            // so the flow is usable end to end without a real provider.
            // Deliberately NOT logged in production — an OTP in prod logs
            // is a credential leak.
            if (process.env.NODE_ENV !== "production") {
                console.log(`[otp] ${email} -> ${otp} (expires in ${OTP_TTL_SECONDS}s)`);
            }

            return { expiresIn: OTP_TTL_SECONDS };
        }),

        // Step 2 of login: verify the OTP, start the session.
        verifyOtp: pub.handler(async ({ input, context }) => {
            const email = String((input as any)?.email ?? "").trim().toLowerCase();
            const otp = String((input as any)?.otp ?? "").trim();

            if (!EMAIL_RE.test(email) || !otp) {
                throw new ORPCError("BAD_REQUEST", { status: 400, message: "Missing email or code" });
            }

            await connectDB();

            const user = await User.findOne({ email });

            if (!user || !user.otp || !user.expired || user.otp !== otp || user.expired.getTime() < Date.now()) {
                throw new ORPCError("INVALID_OTP", { status: 400, message: "Invalid or expired code" });
            }

            user.otp = null;
            user.expired = null;
            await user.save();

            const permissions = await issueSession(context.res, String(user._id));

            return { permissions };
        }),

        // Mints a fresh access token from a valid refresh token. Called by
        // the client automatically after any protected call comes back 401.
        refresh: pub.handler(async ({ context }) => {
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
        }),

        logout: pub.handler(async ({ context }) => {
            clearAuthCookies(context.res);
            return { ok: true };
        }),

        // Example protected procedure — anything under /d can call this to
        // get the current user's id + permissions.
        me: authed.handler(async ({ context }) => {
            return { _id: context.user._id, permissions: context.user.permissions };
        }),
    },
};

export type Router = typeof router;