import { requestOtp, verifyOtp } from "./otp";
import { refresh, logout, me } from "./session";

export const router = {
    auth: {
        requestOtp,
        verifyOtp,
        refresh,
        logout,
        me,
    },
};

export type Router = typeof router;