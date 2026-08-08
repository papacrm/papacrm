import { requestOtp, verifyOtp } from "./otp";
import { refresh, logout, me } from "./session";
import { list, get, create, update, remove } from "./workflows";

export const router = {
    auth: {
        requestOtp,
        verifyOtp,
        refresh,
        logout,
        me,
    },
    workflow: {
        list,
        get,
        create,
        update,
        remove,
    },
};

export type Router = typeof router;