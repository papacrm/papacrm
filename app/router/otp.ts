import { ORPCError } from "@orpc/server";
import { pub } from "../lib-server/orpc/auth";
import { connectDB } from "../lib-server/mongoose";
import User from "../lib-server/models/User";
import { EMAIL_RE, OTP_TTL_SECONDS, generateOtp, issueSession } from "./helpers";

// Step 1 of login: collect an email address, issue + "send" an OTP.
export const requestOtp = pub.handler(async ({ input }) => {
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
});

// Step 2 of login: verify the OTP, start the session.
export const verifyOtp = pub.handler(async ({ input, context }) => {
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
});