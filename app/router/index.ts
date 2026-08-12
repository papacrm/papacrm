import { requestOtp, verifyOtp } from "./otp";
import { refresh, logout, me } from "./session";
import { list, get, create, update, remove, listCallable, listWebhooks } from "./workflows";
import { list as listList, get as listGet, create as listCreate, update as listUpdate, remove as listRemove } from "./lists";
import {
    list as listDocumentList,
    get as listDocumentGet,
    create as listDocumentCreate,
    update as listDocumentUpdate,
    remove as listDocumentRemove,
} from "./listDocuments";

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
        listCallable,
        listWebhooks,
    },
    list: {
        list: listList,
        get: listGet,
        create: listCreate,
        update: listUpdate,
        remove: listRemove,
        document: {
            list: listDocumentList,
            get: listDocumentGet,
            create: listDocumentCreate,
            update: listDocumentUpdate,
            remove: listDocumentRemove,
        },
    },
};

export type Router = typeof router;