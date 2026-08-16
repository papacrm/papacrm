import type { ModuleNodeType, ModuleNodeDef, ModuleNodeCategory } from "./types";
import webhookNode from "./webhook";
import inputFormNode from "./inputForm";
import httpRequestNode from "./httpRequest";
import conditionNode from "./condition";
import staticPageNode from "./staticPage";
import saveRecordNode from "./saveRecord";
import saveToListNode from "./saveToList";
import mapperNode from "./mapper";
import functionNode from "./function";
import callNode from "./call";
import routeNode from "./route";
import forwardNode from "./forward";
import findOneNode from "./findOne";
import tableNode from "./table";
import listViewNode from "./listView";
import cardNode from "./card";
import containerNode from "./container";
import queryNode from "./query";
import setCookieNode from "./setCookie";
import getCookieNode from "./getCookie";
import getHeaderNode from "./getHeader";
import setHeaderNode from "./setHeader";
import jwtVerifyNode from "./jwtVerify";
import jwtSignNode from "./jwtSign";
import menuNode from "./menu";
import tabsNode from "./tabs";
import navbarNode from "./navbar";
import footerNode from "./footer";
import viewNode from "./view";
import gapNode from "./gap";
import jsonNode from "./json";
import htmlNode from "./html";
import cssNode from "./css";
import stateNode from "./state";
import labelNode from "./label";
import linkNode from "./link";
import divNode from "./div";
import classNode from "./class";
import styleNode from "./style";
import textInputNode from "./textInput";
import checkboxInputNode from "./checkboxInput";
import textareaInputNode from "./textareaInput";
import numberInputNode from "./numberInput";
import findNode from "./find";
import matchNode from "./match";
import projectNode from "./project";
import sortNode from "./sort";
import limitNode from "./limit";
import skipNode from "./skip";
import listNode from "./list";
import listUpsertNode from "./listUpsert";
import countNode from "./count";
import distinctNode from "./distinct";
import delayNode from "./delay";
import randomNode from "./random";
import envNode from "./env";
import textNode from "./text";
import imageNode from "./image";
import selectInputNode from "./selectInput";

// ─── Adding a new node ──────────────────────────────────────────────────
// 1. Create `app/lib/node-defs/<name>.ts` exporting a ModuleNodeDef (copy an
//    existing one as a template — see webhook.ts or staticPage.ts).
// 2. Import it above and add it to NODE_DEFS + NODE_ORDER below.
// 3. If it needs to actually run when a module executes (not just be
//    editable), add a matching `app/lib-server/nodes/<name>.ts` on the server side —
//    see that folder's index.ts for the same pattern.
// Nothing else in the editor needs to change.

export const NODE_DEFS: Record<ModuleNodeType, ModuleNodeDef> = {
    webhook: webhookNode,
    inputForm: inputFormNode,
    httpRequest: httpRequestNode,
    condition: conditionNode,
    staticPage: staticPageNode,
    saveRecord: saveRecordNode,
    saveToList: saveToListNode,
    mapper: mapperNode,
    function: functionNode,
    call: callNode,
    route: routeNode,
    forward: forwardNode,
    findOne: findOneNode,
    table: tableNode,
    listView: listViewNode,
    card: cardNode,
    container: containerNode,
    query: queryNode,
    setCookie: setCookieNode,
    getCookie: getCookieNode,
    getHeader: getHeaderNode,
    setHeader: setHeaderNode,
    jwtVerify: jwtVerifyNode,
    jwtSign: jwtSignNode,
    menu: menuNode,
    tabs: tabsNode,
    navbar: navbarNode,
    footer: footerNode,
    view: viewNode,
    gap: gapNode,
    json: jsonNode,
    html: htmlNode,
    css: cssNode,
    state: stateNode,
    label: labelNode,
    link: linkNode,
    div: divNode,
    class: classNode,
    style: styleNode,
    textInput: textInputNode,
    checkboxInput: checkboxInputNode,
    textareaInput: textareaInputNode,
    numberInput: numberInputNode,
    find: findNode,
    match: matchNode,
    project: projectNode,
    sort: sortNode,
    limit: limitNode,
    skip: skipNode,
    list: listNode,
    listUpsert: listUpsertNode,
    count: countNode,
    distinct: distinctNode,
    delay: delayNode,
    random: randomNode,
    env: envNode,
    text: textNode,
    image: imageNode,
    selectInput: selectInputNode,
};

export const NODE_ORDER: ModuleNodeType[] = [
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
    "style",
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
    "env",
    "find",
    "match",
    "project",
    "sort",
    "limit",
    "skip",
    "list",
    "listUpsert",
    "count",
    "distinct",
    "delay",
];

// ─── Editor palette categories ────────────────────────────────────────
// Purely a grouping for the "Add node" palette (see ModuleEditor.tsx) —
// has no effect on execution. CATEGORY_ORDER controls the section order;
// CATEGORY_META gives each one a label/blurb; NODE_CATEGORIES assigns
// every node to exactly one. Every ModuleNodeType must have an entry
// below, or it silently won't show up in any palette section.
export const CATEGORY_ORDER: ModuleNodeCategory[] = ["triggers", "data", "logic", "requests", "responses", "blocks", "forms"];

export const CATEGORY_META: Record<ModuleNodeCategory, { label: string; blurb: string }> = {
    triggers: { label: "Triggers", blurb: "Where a run starts" },
    data: { label: "Data", blurb: "Read, shape, and store list records" },
    logic: { label: "Logic & flow", blurb: "Branch, transform, and call other modules" },
    requests: { label: "Requests & auth", blurb: "HTTP, headers, cookies, tokens" },
    responses: { label: "Responses", blurb: "What a webhook sends back" },
    blocks: { label: "Page blocks", blurb: "Pieces you connect into a View" },
    forms: { label: "Form fields", blurb: "Inputs a person fills in" },
};

export const NODE_CATEGORIES: Record<ModuleNodeType, ModuleNodeCategory> = {
    webhook: "triggers",
    function: "triggers",

    list: "data",
    listUpsert: "data",
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
    env: "requests",

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
    style: "blocks",
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