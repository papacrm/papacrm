import { requestOtp, verifyOtp } from "./otp";
import { refresh, logout, me } from "./session";
import { list, get, create, update, remove, listCallable, listWebhooks } from "./modules";
import {
    list as localModuleList,
    get as localModuleGet,
    create as localModuleCreate,
    update as localModuleUpdate,
    remove as localModuleRemove,
} from "./localModules";
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
    module: {
        list,
        get,
        create,
        update,
        remove,
        listCallable,
        listWebhooks,
    },
    localModule: {
        list: localModuleList,
        get: localModuleGet,
        create: localModuleCreate,
        update: localModuleUpdate,
        remove: localModuleRemove,
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