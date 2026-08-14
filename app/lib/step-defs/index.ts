import type { WorkflowNodeType, WorkflowNodeDef, WorkflowStepCategory } from "./types";
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
import divStep from "./div";
import classStep from "./class";
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
import distinctStep from "./distinct";
import delayStep from "./delay";
import randomStep from "./random";
import textStep from "./text";
import imageStep from "./image";
import selectInputStep from "./selectInput";

// ─── Adding a new step ──────────────────────────────────────────────────
// 1. Create `app/lib/step-defs/<name>.ts` exporting a WorkflowNodeDef (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to NODE_DEFS + NODE_ORDER below.
// 3. If it needs to actually run when a workflow executes (not just be
//    editable), add a matching `app/lib-server/steps/<name>.ts` on the server side —
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
    div: divStep,
    class: classStep,
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
    distinct: distinctStep,
    delay: delayStep,
    random: randomStep,
    text: textStep,
    image: imageStep,
    selectInput: selectInputStep,
};

export const NODE_ORDER: WorkflowNodeType[] = [
    "webhook",
    "function",
    "inputForm",
    "httpRequest",
    "call",
    "route",
    "forward",
    "query",
    "findOne",
    "condition",
    "mapper",
    "staticPage",
    "json",
    "text",
    "html",
    "css",
    "state",
    "label",
    "link",
    "div",
    "class",
    "image",
    "textInput",
    "checkboxInput",
    "textareaInput",
    "numberInput",
    "selectInput",
    "view",
    "menu",
    "tabs",
    "navbar",
    "footer",
    "gap",
    "table",
    "listView",
    "card",
    "container",
    "saveRecord",
    "saveToList",
    "getHeader",
    "setHeader",
    "getCookie",
    "setCookie",
    "jwtVerify",
    "jwtSign",
    "random",
    "find",
    "match",
    "project",
    "sort",
    "limit",
    "skip",
    "list",
    "count",
    "distinct",
    "delay",
];

// ─── Editor palette categories ────────────────────────────────────────
// Purely a grouping for the "Add step" palette (see WorkflowEditor.tsx) —
// has no effect on execution. CATEGORY_ORDER controls the section order;
// CATEGORY_META gives each one a label/blurb; STEP_CATEGORIES assigns
// every step to exactly one. Every WorkflowNodeType must have an entry
// below, or it silently won't show up in any palette section.
export const CATEGORY_ORDER: WorkflowStepCategory[] = ["triggers", "data", "logic", "requests", "responses", "blocks", "forms"];

export const CATEGORY_META: Record<WorkflowStepCategory, { label: string; blurb: string }> = {
    triggers: { label: "Triggers", blurb: "Where a run starts" },
    data: { label: "Data", blurb: "Read, shape, and store list records" },
    logic: { label: "Logic & flow", blurb: "Branch, transform, and call other workflows" },
    requests: { label: "Requests & auth", blurb: "HTTP, headers, cookies, tokens" },
    responses: { label: "Responses", blurb: "What a webhook sends back" },
    blocks: { label: "Page blocks", blurb: "Pieces you connect into a View" },
    forms: { label: "Form fields", blurb: "Inputs a person fills in" },
};

export const STEP_CATEGORIES: Record<WorkflowNodeType, WorkflowStepCategory> = {
    webhook: "triggers",
    function: "triggers",

    list: "data",
    find: "data",
    findOne: "data",
    query: "data",
    match: "data",
    project: "data",
    distinct: "data",
    sort: "data",
    limit: "data",
    skip: "data",
    count: "data",
    saveRecord: "data",
    saveToList: "data",

    condition: "logic",
    mapper: "logic",
    call: "logic",
    route: "logic",
    forward: "logic",
    delay: "logic",

    httpRequest: "requests",
    getHeader: "requests",
    setHeader: "requests",
    getCookie: "requests",
    setCookie: "requests",
    jwtVerify: "requests",
    jwtSign: "requests",
    random: "requests",

    staticPage: "responses",
    json: "responses",
    text: "responses",
    table: "responses",
    listView: "responses",
    card: "responses",
    container: "responses",
    view: "responses",

    menu: "blocks",
    tabs: "blocks",
    navbar: "blocks",
    footer: "blocks",
    gap: "blocks",
    label: "blocks",
    link: "blocks",
    div: "blocks",
    class: "blocks",
    image: "blocks",
    html: "blocks",
    css: "blocks",
    state: "blocks",

    inputForm: "forms",
    textInput: "forms",
    checkboxInput: "forms",
    textareaInput: "forms",
    numberInput: "forms",
    selectInput: "forms",
};

export * from "./types";