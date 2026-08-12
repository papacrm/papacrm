import type { WorkflowNodeType, WorkflowNodeDef } from "./types";
import webhookStep from "./webhook";
import inputFormStep from "./inputForm";
import httpRequestStep from "./httpRequest";
import conditionStep from "./condition";
import staticPageStep from "./staticPage";
import saveRecordStep from "./saveRecord";
import saveToListStep from "./saveToList";
import mapperStep from "./mapper";
import functionStep from "./function";
import callStep from "./call";
import tableStep from "./table";
import containerStep from "./container";
import queryStep from "./query";
import setCookieStep from "./setCookie";
import getCookieStep from "./getCookie";
import getHeaderStep from "./getHeader";
import setHeaderStep from "./setHeader";
import jwtVerifyStep from "./jwtVerify";
import jwtSignStep from "./jwtSign";
import menuStep from "./menu";
import tabsStep from "./tabs";
import navbarStep from "./navbar";
import footerStep from "./footer";
import viewStep from "./view";
import gapStep from "./gap";
import jsonStep from "./json";

// ─── Adding a new step ──────────────────────────────────────────────────
// 1. Create `app/lib/steps/<name>.ts` exporting a WorkflowNodeDef (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to NODE_DEFS + NODE_ORDER below.
// 3. If it needs to actually run when a workflow executes (not just be
//    editable), add a matching `lib/steps/<name>.ts` on the server side —
//    see that folder's index.ts for the same pattern.
// Nothing else in the editor needs to change.

export const NODE_DEFS: Record<WorkflowNodeType, WorkflowNodeDef> = {
    webhook: webhookStep,
    inputForm: inputFormStep,
    httpRequest: httpRequestStep,
    condition: conditionStep,
    staticPage: staticPageStep,
    saveRecord: saveRecordStep,
    saveToList: saveToListStep,
    mapper: mapperStep,
    function: functionStep,
    call: callStep,
    table: tableStep,
    container: containerStep,
    query: queryStep,
    setCookie: setCookieStep,
    getCookie: getCookieStep,
    getHeader: getHeaderStep,
    setHeader: setHeaderStep,
    jwtVerify: jwtVerifyStep,
    jwtSign: jwtSignStep,
    menu: menuStep,
    tabs: tabsStep,
    navbar: navbarStep,
    footer: footerStep,
    view: viewStep,
    gap: gapStep,
    json: jsonStep,
};

export const NODE_ORDER: WorkflowNodeType[] = [
    "webhook",
    "function",
    "inputForm",
    "httpRequest",
    "call",
    "query",
    "condition",
    "mapper",
    "staticPage",
    "json",
    "view",
    "menu",
    "tabs",
    "navbar",
    "footer",
    "gap",
    "table",
    "container",
    "saveRecord",
    "saveToList",
    "getHeader",
    "setHeader",
    "getCookie",
    "setCookie",
    "jwtVerify",
    "jwtSign",
];

export * from "./types";