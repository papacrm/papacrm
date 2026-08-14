import type { WorkflowNodeType } from "../models/Workflow";
import type { StepExecutor } from "./types";
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
import routeStep from "./route";
import forwardStep from "./forward";
import findOneStep from "./findOne";
import tableStep from "./table";
import listViewStep from "./listView";
import cardStep from "./card";
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
import htmlStep from "./html";
import cssStep from "./css";
import stateStep from "./state";
import labelStep from "./label";
import linkStep from "./link";
import textInputStep from "./textInput";
import checkboxInputStep from "./checkboxInput";
import textareaInputStep from "./textareaInput";
import numberInputStep from "./numberInput";
import findStep from "./find";
import matchStep from "./match";
import projectStep from "./project";
import sortStep from "./sort";
import limitStep from "./limit";
import skipStep from "./skip";
import listStep from "./list";
import countStep from "./count";

// ─── Adding a new step ──────────────────────────────────────────────────
// 1. Create `lib/steps/<name>.ts` exporting a StepExecutor (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to STEP_EXECUTORS below.
// 3. Editor-side, add the matching `app/lib/steps/<name>.ts` — see that
//    folder's index.ts for the same pattern.
// workflowEngine.ts itself never needs to change.

export const STEP_EXECUTORS: Record<WorkflowNodeType, StepExecutor> = {
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
    route: routeStep,
    forward: forwardStep,
    findOne: findOneStep,
    table: tableStep,
    listView: listViewStep,
    card: cardStep,
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
    html: htmlStep,
    css: cssStep,
    state: stateStep,
    label: labelStep,
    link: linkStep,
    textInput: textInputStep,
    checkboxInput: checkboxInputStep,
    textareaInput: textareaInputStep,
    numberInput: numberInputStep,
    find: findStep,
    match: matchStep,
    project: projectStep,
    sort: sortStep,
    limit: limitStep,
    skip: skipStep,
    list: listStep,
    count: countStep,
};

export * from "./types";